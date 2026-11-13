// Handles reservation requests and their links to activities and the budget.
// BookingValidation checks input; this file coordinates database changes.
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;
using TravelAssistant.Services;

namespace TravelAssistant.Endpoints;

public sealed record DismissBookingDateWarningRequest(string Key);
public sealed record SetBookingPaymentRequest(
    decimal AmountPaid,
    decimal ExpectedAmountPaid,
    decimal? ExpectedTotalCost,
    BookingStatus? ExpectedStatus,
    decimal? ExpectedAmountRefunded);

/// <summary>Defines the API workflow for trip bookings and their first-version relationships.</summary>
public static class BookingEndpoints
{
    /// <summary>Connects booking URLs to their request handlers and the owned-trip check.</summary>
    public static IEndpointRouteBuilder MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var routes = app.MapOwnedTripGroup();

        routes.MapGet("/bookings", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var bookings = await database.Bookings
                .Where(booking => booking.TripId == tripId)
                .Include(booking => booking.Trip)
                .Include(booking => booking.Activities)
                .Include(booking => booking.Expense)
                .Include(booking => booking.ItemCost).ThenInclude(cost => cost.PlannedCost)
                .ToListAsync();

            var ordered = bookings
                .OrderBy(booking => booking.Status == BookingStatus.Cancelled)
                .ThenBy(booking => booking.StartDate)
                .ThenBy(booking => booking.StartTime == null)
                .ThenBy(booking => booking.StartTime)
                .ThenBy(booking => booking.CreatedAtUtc);

            return Results.Ok(ordered.Select(ToResponse));
        }).WithName("GetBookings");

        routes.MapGet("/bookings/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            return booking is null ? Results.NotFound() : Results.Ok(ToResponse(booking));
        }).WithName("GetBooking");

        routes.MapPost("/bookings", async (Guid tripId, SaveBookingRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = BookingValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var trip = await database.Trips.SingleOrDefaultAsync(trip => trip.Id == tripId);
            if (trip is null)
            {
                return Results.NotFound();
            }

            var core = new ItemCore { TripId = tripId };
            var booking = new Booking
            {
                TripId = tripId,
                Trip = trip,
                ItemCore = core,
                ItemCost = new ItemCost { ItemCore = core },
                PaymentTotals = new ItemPaymentTotals { ItemCore = core }
            };
            ApplyRequest(booking, request);
            database.Bookings.Add(booking);
            await database.SaveChangesAsync();

            return Results.Created($"/api/trips/{tripId}/bookings/{booking.Id}", ToResponse(booking));
        }).WithName("CreateBooking");

        routes.MapPut("/bookings/{id:guid}", async (
            Guid tripId,
            Guid id,
            SaveBookingRequest request,
            TravelAssistantDbContext database) =>
        {
            var validationError = BookingValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var booking = await FindBooking(tripId, id, database);
            if (booking is null)
            {
                return Results.NotFound();
            }

            if ((request.TotalCost is null || request.TotalCost == 0) && booking.Expense is not null)
            {
                return Results.Conflict("Unlink or delete the related expense before clearing this booking's cost.");
            }

            if (request.TotalCost is null or 0 && await database.PlannedCosts.AnyAsync(item => item.ItemCoreId == booking.ItemCoreId))
            {
                return Results.Conflict("Remove the related planned cost before clearing this booking's cost.");
            }

            if (request.AmountPaid == 0 && booking.Expense?.SharesBookingPayment == true)
            {
                return Results.Conflict("Unlink or delete the related expense before clearing this booking's payment.");
            }

            foreach (var activity in booking.Activities)
            {
                var changedFields = GetChangedFields(
                    booking,
                    request,
                    activity.BookingRole ?? BookingActivityRole.General);
                if (changedFields.Count > 0)
                {
                    activity.HasPendingActivityUpdateReview = true;
                    activity.PendingActivityChangeFields = MergeChangeFields(
                        activity.PendingActivityChangeFields,
                        changedFields);
                }
            }

            ApplyRequest(booking, request);
            await LinkedRecordReviews.TrackAsync(database, booking);
            try
            {
                await database.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The booking changed while saving. Refresh and try again.");
            }
            return Results.Ok(ToResponse(booking));
        }).WithName("UpdateBooking");

        routes.MapPost("/bookings/{id:guid}/payment", async (
            Guid tripId,
            Guid id,
            SetBookingPaymentRequest request,
            TravelAssistantDbContext database) =>
        {
            await using var transaction = database.Database.IsRelational()
                ? await database.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                : null;
            var booking = await FindBooking(tripId, id, database);
            if (booking is null) return Results.NotFound();
            if (booking.AmountPaid != request.ExpectedAmountPaid || booking.TotalCost != request.ExpectedTotalCost
                || booking.Status != request.ExpectedStatus || booking.AmountRefunded != request.ExpectedAmountRefunded)
            {
                return Results.Conflict("This booking's payment details changed. Refresh before updating them.");
            }
            if (booking.Status == BookingStatus.Cancelled || booking.TotalCost is null or <= 0)
                return Results.Conflict("Use the booking edit form to change this booking's payment details.");
            if (request.AmountPaid == 0 && booking.Expense?.SharesBookingPayment == true)
            {
                return Results.Conflict("Unlink or delete the related expense before clearing this booking's payment.");
            }
            var validationError = BookingValidation.Validate(LinkedRecordReviews.ToRequest(booking) with
            {
                AmountPaid = request.AmountPaid,
            });
            if (validationError is not null) return Results.BadRequest(validationError);

            booking.AmountPaid = request.AmountPaid;
            await LinkedRecordReviews.TrackAsync(database, booking);
            try
            {
                await database.SaveChangesAsync();
                if (transaction is not null) await transaction.CommitAsync();
            }
            catch (Exception exception) when (exception is DbUpdateException
                || BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The booking changed while saving. Refresh and try again.");
            }
            return Results.Ok(ToResponse(booking));
        }).WithName("SetBookingPayment");

        routes.MapDelete("/bookings/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            if (booking is null)
            {
                return Results.NotFound();
            }

            foreach (var activity in booking.Activities)
            {
                activity.HasPendingDeletedBookingNotice = true;
            }

            if (booking.Expense is not null)
            {
                booking.Expense.HasPendingDeletedBookingNotice = true;
            }

            var retainPayments = booking.Expense?.SharesBookingPayment == true;
            var retainCost = await database.PlannedCosts.AnyAsync(item => item.ItemCoreId == booking.ItemCoreId);
            database.Bookings.Remove(booking);
            if (retainPayments || retainCost)
            {
                booking.ItemCore.Revision = Guid.NewGuid();
                if (!retainCost) database.ItemCosts.Remove(booking.ItemCost);
                if (!retainPayments) database.ItemPaymentTotals.Remove(booking.PaymentTotals);
            }
            else
            {
                database.ItemCores.Remove(booking.ItemCore);
            }
            await LinkedRecordReviews.ClearRecordAsync(database, tripId, id);
            try
            {
                await database.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The booking changed while deleting it. Refresh and try again.");
            }
            return Results.NoContent();
        }).WithName("DeleteBooking");

        routes.MapPost("/bookings/{id:guid}/dismiss-deleted-link-notices", async (
            Guid tripId,
            Guid id,
            TravelAssistantDbContext database) =>
        {
            var booking = await database.Bookings.SingleOrDefaultAsync(item => item.Id == id && item.TripId == tripId);
            if (booking is null)
            {
                return Results.NotFound();
            }

            booking.HasPendingDeletedActivityNotice = false;
            booking.HasPendingDeletedExpenseNotice = false;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissBookingDeletedLinkNotices");

        routes.MapPost("/bookings/{id:guid}/activities/{activityId:guid}", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            LinkBookingActivityRequest request,
            TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            var activity = await database.ItineraryItems
                .SingleOrDefaultAsync(item => item.Id == activityId && item.TripId == tripId);
            if (booking is null || activity is null)
            {
                return Results.NotFound();
            }

            if (activity.BookingId is not null && activity.BookingId != booking.Id)
            {
                return Results.Conflict("This activity is already linked to another booking.");
            }

            if (request.Role != BookingActivityRole.General
                && booking.Category is not BookingCategory.Flight and not BookingCategory.RailBusFerry)
            {
                return Results.BadRequest("Journey-leg links are available only for flight, train, bus, or ferry bookings.");
            }

            if (request.Role == BookingActivityRole.Return && booking.ReturnStartDate is null)
            {
                return Results.BadRequest("Add a return journey before linking a return activity.");
            }

            activity.BookingId = booking.Id;
            await LinkedRecordReviews.ClearPairAsync(database, booking.Id, activity.Id);
            activity.BookingRole = request.Role;
            activity.BookingRequired = true;
            activity.HasPendingDeletedBookingNotice = false;
            activity.HasPendingBookingUpdateReview = false;
            activity.HasPendingActivityUpdateReview = false;
            activity.PendingBookingChangeFields = null;
            activity.PendingActivityChangeFields = null;
            await LinkedRecordReviews.InitialiseActivityLinkAsync(database, booking, activity);
            await database.SaveChangesAsync();

            return Results.Ok(new { activity.Id, activity.BookingId, activity.BookingRole });
        }).WithName("LinkBookingActivity");

        routes.MapDelete("/bookings/{id:guid}/activities/{activityId:guid}", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            TravelAssistantDbContext database) =>
        {
            var activity = await database.ItineraryItems.SingleOrDefaultAsync(item =>
                item.Id == activityId && item.TripId == tripId && item.BookingId == id);
            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.BookingId = null;
            await LinkedRecordReviews.ClearPairAsync(database, id, activityId);
            activity.BookingRole = null;
            activity.HasPendingBookingUpdateReview = false;
            activity.HasPendingActivityUpdateReview = false;
            activity.PendingBookingChangeFields = null;
            activity.PendingActivityChangeFields = null;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("UnlinkBookingActivity");

        routes.MapPost("/bookings/{id:guid}/activities/{activityId:guid}/dismiss-booking-update-review", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            TravelAssistantDbContext database) =>
        {
            var activity = await database.ItineraryItems.SingleOrDefaultAsync(item =>
                item.Id == activityId && item.BookingId == id && item.TripId == tripId);
            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.HasPendingBookingUpdateReview = false;
            activity.PendingBookingChangeFields = null;
            var review = await database.LinkedRecordReviews.SingleOrDefaultAsync(item =>
                item.TripId == tripId && item.SourceId == activityId && item.TargetId == id);
            if (review is not null) database.LinkedRecordReviews.Remove(review);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissBookingUpdateReview");

        routes.MapPost("/bookings/{id:guid}/activities/{activityId:guid}/dismiss-activity-update-review", async (
            Guid tripId,
            Guid id,
            Guid activityId,
            TravelAssistantDbContext database) =>
        {
            var activity = await database.ItineraryItems.SingleOrDefaultAsync(item =>
                item.Id == activityId && item.BookingId == id && item.TripId == tripId);
            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.HasPendingActivityUpdateReview = false;
            activity.PendingActivityChangeFields = null;
            var review = await database.LinkedRecordReviews.SingleOrDefaultAsync(item =>
                item.TripId == tripId && item.SourceId == id && item.TargetId == activityId);
            if (review is not null) database.LinkedRecordReviews.Remove(review);
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissActivityUpdateReview");

        routes.MapPost("/bookings/{id:guid}/expenses", async (
            Guid tripId,
            Guid id,
            CreateBookingExpenseRequest request,
            TravelAssistantDbContext database) =>
        {
            await using var transaction = database.Database.IsRelational()
                ? await database.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                : null;
            var validationError = ExpenseValidation.Validate(new CreateExpenseRequest(
                request.Name,
                request.Category,
                request.Amount,
                request.ExpenseDate,
                null));
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var booking = await FindBooking(tripId, id, database);
            if (booking is null)
            {
                return Results.NotFound();
            }

            if (booking.Expense is { SharesBookingPayment: true } existing)
            {
                return Results.Ok(ToExpenseResponse(existing, booking));
            }

            var eligibilityError = ValidateExpenseEligibility(booking);
            if (eligibilityError is not null)
            {
                return eligibilityError;
            }

            if (booking.Expense is not null)
            {
                return Results.Conflict("This booking already has a linked expense.");
            }

            if (request.PaymentUpdate is not null)
            {
                var paymentError = BookingExpensePayments.Apply(booking, request.Amount, request.PaymentUpdate);
                if (paymentError is not null) return Results.Conflict(paymentError);
                await LinkedRecordReviews.TrackAsync(database, booking);
            }
            else if (request.Amount != booking.GetPaymentAmounts().Net)
            {
                return Results.Conflict("Confirm the change to the booking payment before adding this expense.");
            }
            else
            {
                booking.ItemCore.Revision = Guid.NewGuid();
            }

            var expense = new Expense
            {
                TripId = tripId,
                Booking = booking,
                PlannedCost = await database.PlannedCosts.SingleOrDefaultAsync(item => item.ItemCoreId == booking.ItemCoreId),
                Name = NormalizeBudgetName(request.Name),
                Category = request.Category,
                ItemCore = booking.ItemCore,
                PaymentTotals = booking.PaymentTotals,
                ExpenseDate = request.ExpenseDate
            };
            database.Expenses.Add(expense);
            try
            {
                await database.SaveChangesAsync();
                if (transaction is not null) await transaction.CommitAsync();
            }
            catch (Exception exception) when (
                BudgetRelationshipConstraintErrors.IsBookingExpenseViolation(exception))
            {
                return Results.Conflict("This booking already has a linked expense.");
            }
            catch (Exception exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The booking changed while adding the expense. Refresh and try again.");
            }

            return Results.Created(
                $"/api/trips/{tripId}/expenses/{expense.Id}",
                ToExpenseResponse(expense, booking));
        }).WithName("CreateBookingExpense");

        routes.MapPost("/bookings/{id:guid}/expenses/{expenseId:guid}", async (
            Guid tripId,
            Guid id,
            Guid expenseId,
            [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] LinkBookingExpenseRequest? request,
            TravelAssistantDbContext database) =>
        {
            await using var transaction = database.Database.IsRelational()
                ? await database.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                : null;
            var booking = await FindBooking(tripId, id, database);
            var expense = await database.Expenses.Include(item => item.PlannedCost).SingleOrDefaultAsync(item =>
                item.Id == expenseId && item.TripId == tripId);
            if (booking is null || expense is null)
            {
                return Results.NotFound();
            }

            if (expense.BookingId == booking.Id && expense.ItemCoreId == booking.ItemCoreId)
            {
                return Results.Ok(ToExpenseResponse(expense, booking));
            }

            var eligibilityError = ValidateExpenseEligibility(booking);
            if (eligibilityError is not null)
            {
                return eligibilityError;
            }

            if (booking.Expense is not null && booking.Expense.Id != expense.Id)
            {
                return Results.Conflict("This booking already has a linked expense.");
            }

            if (expense.BookingId is not null && expense.BookingId != booking.Id)
            {
                return Results.Conflict("This expense is already linked to another booking.");
            }

            try
            {
                var error = await PrepareSharedExpenseLink(database, booking, expense, request?.Selection);
                if (error is not null) return Results.Conflict(error);
                await LinkedRecordReviews.ClearPairAsync(database, booking.Id, expense.Id);
                await database.SaveChangesAsync();
                if (transaction is not null) await transaction.CommitAsync();
            }
            catch (Exception exception) when (
                BudgetRelationshipConstraintErrors.IsBookingExpenseViolation(exception))
            {
                return Results.Conflict("This booking already has a linked expense.");
            }
            catch (Exception exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The booking changed while linking the expense. Refresh and try again.");
            }
            return Results.Ok(ToExpenseResponse(expense, booking));
        }).WithName("LinkBookingExpense");

        routes.MapDelete("/bookings/{id:guid}/expenses/{expenseId:guid}", async (
            Guid tripId,
            Guid id,
            Guid expenseId,
            TravelAssistantDbContext database) =>
        {
            await using var transaction = database.Database.IsRelational()
                ? await database.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                : null;
            var expense = await database.Expenses.Include(item => item.Booking).SingleOrDefaultAsync(item =>
                item.Id == expenseId && item.TripId == tripId && item.BookingId == id);
            if (expense is null) return Results.NotFound();

            if (expense.SharesBookingPayment)
            {
                await FinancialUnlink.DetachExpenseAsync(database, expense, keepBookingCostAndPayment: true);
            }
            else
            {
                expense.ItemCore.Revision = Guid.NewGuid();
                await FinancialUnlink.ClearBookingLinkAsync(database, expense);
            }
            return await FinancialUnlink.SaveAsync(database, transaction);
        }).WithName("UnlinkBookingExpense");

        routes.MapDelete("/bookings/{id:guid}/planned-costs/{planId:guid}", async (
            Guid tripId,
            Guid id,
            Guid planId,
            TravelAssistantDbContext database) =>
        {
            await using var transaction = database.Database.IsRelational()
                ? await database.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable)
                : null;
            var plan = await database.PlannedCosts.SingleOrDefaultAsync(item => item.TripId == tripId && item.Id == planId);
            if (plan is null || !await database.Bookings.AnyAsync(booking =>
                booking.Id == id && booking.TripId == tripId && booking.ItemCoreId == plan.ItemCoreId))
            {
                return Results.NotFound();
            }

            var expense = await database.Expenses.SingleOrDefaultAsync(item =>
                item.TripId == tripId && item.PlannedCostId == plan.Id);
            await FinancialUnlink.DetachPlanAsync(database, plan, expense, keepBookingCost: true);
            return await FinancialUnlink.SaveAsync(database, transaction);
        }).WithName("UnlinkBookingPlannedCost");

        routes.MapPost("/bookings/{id:guid}/dismiss-outside-trip-warning", async (
            Guid tripId,
            Guid id,
            DismissBookingDateWarningRequest request,
            TravelAssistantDbContext database) =>
        {
            var booking = await FindBooking(tripId, id, database);
            if (booking is null) return Results.NotFound();
            var warning = BookingDateWarnings.Get(booking);
            if (warning is null || warning.Key != request.Key)
                return Results.Conflict("The booking or trip dates changed. Refresh before dismissing this warning.");
            booking.DismissedOutsideTripWarningKey = warning.Key;
            await database.SaveChangesAsync();
            return Results.NoContent();
        }).WithName("DismissBookingOutsideTripWarning");

        return app;
    }

    private static Task<Booking?> FindBooking(Guid tripId, Guid id, TravelAssistantDbContext database) =>
        database.Bookings
            .Include(booking => booking.Trip)
            .Include(booking => booking.Activities)
            .Include(booking => booking.Expense)
            .Include(booking => booking.ItemCost).ThenInclude(cost => cost.PlannedCost)
            .SingleOrDefaultAsync(booking => booking.Id == id && booking.TripId == tripId);

    private static void ApplyRequest(Booking booking, SaveBookingRequest request)
    {
        booking.Name = request.Name.Trim();
        booking.Category = request.Category;
        booking.Status = request.Status;
        booking.Provider = NormalizeOptionalText(request.Provider);
        booking.ConfirmationNumber = NormalizeOptionalText(request.ConfirmationNumber);
        booking.StartDate = request.StartDate;
        booking.StartTime = request.StartTime;
        booking.EndDate = request.EndDate;
        booking.EndTime = request.EndTime;
        booking.Location = NormalizeOptionalText(request.Location);
        booking.StartLocation = NormalizeOptionalText(request.StartLocation);
        booking.EndLocation = NormalizeOptionalText(request.EndLocation);
        booking.ReturnStartDate = request.ReturnStartDate;
        booking.ReturnStartTime = request.ReturnStartTime;
        booking.ReturnStartLocation = NormalizeOptionalText(request.ReturnStartLocation);
        booking.ReturnEndDate = request.ReturnEndDate;
        booking.ReturnEndTime = request.ReturnEndTime;
        booking.ReturnEndLocation = NormalizeOptionalText(request.ReturnEndLocation);
        booking.ExternalLink = NormalizeOptionalText(request.ExternalLink);
        booking.Note = NormalizeOptionalText(request.Note);
        booking.TotalCost = request.TotalCost;
        booking.AmountPaid = request.AmountPaid;
        booking.AmountRefunded = request.AmountRefunded;
    }

    private static string? NormalizeOptionalText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static IResult? ValidateExpenseEligibility(Booking booking)
    {
        var payment = booking.GetPaymentAmounts();
        if (booking.TotalCost is null or <= 0
            || (payment.Paid > 0 && payment.Net <= 0))
        {
            return Results.Conflict("Expenses need a positive booking cost and cannot be linked after a full refund.");
        }

        return null;
    }

    private static string NormalizeBudgetName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Cost item" : name.Trim();

    private static async Task<string?> PrepareSharedExpenseLink(
        TravelAssistantDbContext database,
        Booking booking,
        Expense expense,
        BookingExpenseLinkSelection? selection)
    {
        var bookingPayment = booking.GetPaymentAmounts();
        var expensePayment = new PaymentAmounts(expense.PaymentTotals.Paid, expense.PaymentTotals.Refunded);
        if (expensePayment.Refunded > 0 && booking.Status != BookingStatus.Cancelled)
        {
            return "Only a cancelled booking can link to an expense with a refund.";
        }

        if (selection is null || selection.BookingRevision != booking.ItemCore.Revision
            || selection.ExpenseRevision != expense.ItemCore.Revision)
        {
            return "Refresh the booking and expense before confirming which payment to keep.";
        }

        var payment = selection.PaymentSource switch
        {
            BookingExpensePaymentSource.Booking => bookingPayment,
            BookingExpensePaymentSource.Expense => expensePayment,
            null when bookingPayment == expensePayment => bookingPayment,
            _ => (PaymentAmounts?)null
        };
        if (payment is not PaymentAmounts selected)
        {
            return "Choose which payment to keep before linking this expense.";
        }
        if (selected.Paid <= 0)
        {
            return "An expense needs a recorded payment. Choose the expense payment or keep the records separate.";
        }

        var sourcePlan = expense.PlannedCost;
        var differentTotal = sourcePlan is not null && sourcePlan.Amount != booking.TotalCost;
        var total = selection.TotalSource switch
        {
            BookingExpenseTotalSource.Booking when differentTotal => booking.TotalCost,
            BookingExpenseTotalSource.PlannedCost when differentTotal => sourcePlan!.Amount,
            null when !differentTotal => Math.Max(booking.TotalCost ?? 0, selected.Paid),
            _ => null
        };
        if (total is null)
        {
            return "Choose which total cost to keep before linking this expense.";
        }
        var error = BookingValidation.ValidatePayment(total, selected.Paid, selected.Refunded, booking.Status);
        if (error is not null) return error;

        var bookingPlan = await database.PlannedCosts.SingleOrDefaultAsync(item => item.ItemCoreId == booking.ItemCoreId);
        if (sourcePlan is not null && bookingPlan is not null)
        {
            return "The booking and expense each have a planned cost. Keep the entries separate for now.";
        }

        booking.TotalCost = total;
        booking.AmountPaid = selected.Paid;
        booking.AmountRefunded = selected.Refunded;
        await LinkedRecordReviews.TrackAsync(database, booking, expense.Id);

        var previousCore = expense.ItemCore;
        expense.Booking = booking;
        expense.ItemCore = booking.ItemCore;
        expense.PaymentTotals = booking.PaymentTotals;
        expense.PlannedCost = sourcePlan ?? bookingPlan;
        expense.HasPendingDeletedBookingNotice = false;
        if (sourcePlan is not null)
        {
            sourcePlan.ItemCore = booking.ItemCore;
            sourcePlan.ItemCost = booking.ItemCost;
            await LinkedRecordReviews.ClearPairAsync(database, sourcePlan.Id, expense.Id);
        }
        database.ChangeTracker.DetectChanges();
        database.ItemCores.Remove(previousCore);
        return null;
    }

    private static object ToExpenseResponse(Expense expense, Booking booking) => new
    {
        expense.Id,
        expense.TripId,
        expense.PlannedCostId,
        expense.BookingId,
        BookingName = booking.Name,
        expense.Name,
        expense.Category,
        expense.Amount,
        expense.PaymentTotals.Paid,
        expense.PaymentTotals.Refunded,
        expense.ItemCore.Revision,
        expense.SharesBookingPayment,
        PlannedAmount = expense.PlannedCost?.Amount,
        PlannedCostName = expense.PlannedCost?.Name,
        BookingTotalCost = expense.SharesBookingPayment ? booking.TotalCost : null,
        expense.ExpenseDate,
        expense.CreatedAtUtc,
        Booking = ToResponse(booking),
    };

    // Track which booking details changed so linked activities can show a
    // review notice instead of silently copying the new values.
    private static List<string> GetChangedFields(
        Booking booking,
        SaveBookingRequest request,
        BookingActivityRole role)
    {
        var fields = new List<string>();
        var costChanged = booking.TotalCost != request.TotalCost;
        if (role == BookingActivityRole.Return)
        {
            var returnScheduleChanged = booking.ReturnStartDate != request.ReturnStartDate
                || booking.ReturnStartTime != request.ReturnStartTime
                || booking.ReturnEndDate != request.ReturnEndDate
                || booking.ReturnEndTime != request.ReturnEndTime;
            var returnLocationChanged = booking.ReturnStartLocation != NormalizeOptionalText(request.ReturnStartLocation)
                || booking.ReturnEndLocation != NormalizeOptionalText(request.ReturnEndLocation);
            if (returnScheduleChanged) fields.Add("schedule");
            if (returnLocationChanged) fields.Add("location");
            if (costChanged) fields.Add("cost");
            return fields;
        }

        var scheduleChanged = booking.StartDate != request.StartDate
            || booking.StartTime != request.StartTime
            || booking.EndDate != request.EndDate
            || booking.EndTime != request.EndTime;
        var locationChanged = role == BookingActivityRole.Outbound
            ? booking.StartLocation != NormalizeOptionalText(request.StartLocation)
                || booking.EndLocation != NormalizeOptionalText(request.EndLocation)
            : booking.Location != NormalizeOptionalText(request.Location);

        if (scheduleChanged) fields.Add("schedule");
        if (locationChanged) fields.Add("location");
        if (costChanged) fields.Add("cost");
        return fields;
    }

    private static string MergeChangeFields(string? existing, IEnumerable<string> changedFields) =>
        string.Join(",", (existing ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Concat(changedFields)
            .Distinct(StringComparer.Ordinal)
            .Order());

    // Shape the stored booking and its related records for the frontend.
    private static object ToResponse(Booking booking) => new
    {
        booking.Id,
        booking.TripId,
        booking.Name,
        booking.Category,
        booking.Status,
        booking.Provider,
        booking.ConfirmationNumber,
        booking.StartDate,
        booking.StartTime,
        booking.EndDate,
        booking.EndTime,
        booking.Location,
        booking.StartLocation,
        booking.EndLocation,
        booking.ReturnStartDate,
        booking.ReturnStartTime,
        booking.ReturnStartLocation,
        booking.ReturnEndDate,
        booking.ReturnEndTime,
        booking.ReturnEndLocation,
        booking.ExternalLink,
        booking.Note,
        booking.TotalCost,
        booking.AmountPaid,
        booking.AmountRefunded,
        booking.ItemCore.Revision,
        booking.HasPendingDeletedActivityNotice,
        booking.HasPendingDeletedExpenseNotice,
        FinancialStatus = GetFinancialStatus(booking),
        OutsideTripWarning = BookingDateWarnings.Get(booking),
        booking.DismissedOutsideTripWarningKey,
        NetCost = booking.GetPaymentAmounts().Net,
        ActivityLinks = booking.Activities.Select(activity => new
        {
            activity.Id,
            activity.Name,
            activity.Date,
            activity.StartTime,
            Role = activity.BookingRole,
            activity.HasPendingBookingUpdateReview,
            activity.HasPendingActivityUpdateReview,
            activity.PendingBookingChangeFields,
            activity.PendingActivityChangeFields
        }),
        ExpenseId = booking.Expense?.Id,
        PlannedCost = booking.ItemCost.PlannedCost is PlannedCost plan
            ? new { plan.Id, plan.Name }
            : null,
        booking.CreatedAtUtc
    };

    private static string? GetFinancialStatus(Booking booking)
    {
        if (booking.TotalCost is null)
        {
            return null;
        }

        if (booking.TotalCost == 0)
        {
            return "Free";
        }

        if (booking.AmountRefunded > 0)
        {
            return "Refunded";
        }

        if (booking.AmountPaid == 0)
        {
            return "Unpaid";
        }

        return booking.AmountPaid == booking.TotalCost ? "Paid" : "PartiallyPaid";
    }
}
