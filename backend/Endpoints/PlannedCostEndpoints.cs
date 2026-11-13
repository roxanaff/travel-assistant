// Handles requests for expected trip costs. It checks ownership and any
// relationship to expenses before changing stored records.
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Validation;
using TravelAssistant.Services;

namespace TravelAssistant.Endpoints;

/// <summary>
/// Defines the API workflow for estimated trip costs before they become actual expenses.
/// </summary>
public static class PlannedCostEndpoints
{
    /// <summary>Maps all routes that create, read, update, or delete a trip's planned costs.</summary>
    public static IEndpointRouteBuilder MapPlannedCostEndpoints(this IEndpointRouteBuilder app)
    {
        var routes = app.MapOwnedTripGroup();
        routes.MapGet("/planned-costs", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var plannedCosts = await database.PlannedCosts
                .Where(cost => cost.TripId == tripId)
                .Include(cost => cost.Expense)
                .ToListAsync();
            var bookings = await database.Bookings
                .Where(booking => booking.TripId == tripId)
                .Select(booking => new { booking.ItemCoreId, booking.Id, booking.Name, booking.PaymentTotals.Paid })
                .ToDictionaryAsync(booking => booking.ItemCoreId);

            return Results.Ok(plannedCosts.OrderBy(cost => cost.CreatedAtUtc).Select(cost =>
            {
                var booking = bookings.GetValueOrDefault(cost.ItemCoreId);
                return ToResponse(cost, booking?.Id, booking?.Name, booking?.Paid);
            }));
        }).WithName("GetPlannedCosts");

        routes.MapPost("/planned-costs", async (Guid tripId, CreatePlannedCostRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = PlannedCostValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var tripExists = await database.Trips.AnyAsync(trip => trip.Id == tripId);
            if (!tripExists)
            {
                return Results.NotFound();
            }

            var core = new ItemCore { TripId = tripId };
            var plannedCost = new PlannedCost
            {
                TripId = tripId,
                Name = NormalizeName(request.Name),
                Category = request.Category,
                ItemCore = core,
                ItemCost = new ItemCost { ItemCore = core, Cost = request.Amount }
            };

            database.PlannedCosts.Add(plannedCost);
            await database.SaveChangesAsync();
            return Results.Created($"/api/trips/{tripId}/planned-costs/{plannedCost.Id}", ToResponse(plannedCost));
        }).WithName("CreatePlannedCost");

        routes.MapPut("/planned-costs/{id:guid}", async (Guid tripId, Guid id, CreatePlannedCostRequest request, TravelAssistantDbContext database) =>
        {
            var validationError = PlannedCostValidation.Validate(request);
            if (validationError is not null)
            {
                return Results.BadRequest(validationError);
            }

            var plannedCost = await database.PlannedCosts
                .Include(cost => cost.Expense)
                .SingleOrDefaultAsync(cost => cost.Id == id && cost.TripId == tripId);
            if (plannedCost is null)
            {
                return Results.NotFound();
            }

            var booking = await database.Bookings.SingleOrDefaultAsync(item => item.ItemCoreId == plannedCost.ItemCoreId);
            if ((booking is not null || request.ExpectedRevision is not null)
                && request.ExpectedRevision != plannedCost.ItemCore.Revision)
            {
                return Results.Conflict("The planned cost or booking changed. Refresh before saving.");
            }
            if (booking is not null)
            {
                var error = BookingValidation.ValidatePayment(request.Amount, booking.AmountPaid, booking.AmountRefunded, booking.Status);
                if (error is not null) return Results.BadRequest(error);
            }

            plannedCost.Name = NormalizeName(request.Name);
            plannedCost.Category = request.Category;
            plannedCost.ItemCost.Cost = request.Amount;

            await LinkedRecordReviews.TrackAsync(database, (object?)booking ?? plannedCost);
            try
            {
                await database.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The planned cost or booking changed. Refresh before saving.");
            }
            return Results.Ok(ToResponse(plannedCost, booking?.Id, booking?.Name, booking?.AmountPaid));
        }).WithName("UpdatePlannedCost");

        routes.MapDelete("/planned-costs/{id:guid}", async (Guid tripId, Guid id, TravelAssistantDbContext database) =>
        {
            var plannedCost = await database.PlannedCosts
                .Include(cost => cost.Expense)
                .SingleOrDefaultAsync(cost => cost.Id == id && cost.TripId == tripId);
            if (plannedCost is null)
            {
                return Results.NotFound();
            }

            database.PlannedCosts.Remove(plannedCost);
            var hasBooking = await database.Bookings.AnyAsync(item => item.ItemCoreId == plannedCost.ItemCoreId);
            var hasExpense = await database.Expenses.AnyAsync(item => item.ItemCoreId == plannedCost.ItemCoreId);
            if (hasBooking || hasExpense)
            {
                plannedCost.ItemCore.Revision = Guid.NewGuid();
                if (!hasBooking) database.ItemCosts.Remove(plannedCost.ItemCost);
            }
            else
            {
                database.ItemCores.Remove(plannedCost.ItemCore);
            }
            await LinkedRecordReviews.ClearRecordAsync(database, tripId, id);
            try
            {
                await database.SaveChangesAsync();
            }
            catch (DbUpdateException exception) when (BudgetRelationshipConstraintErrors.IsFinancialItemWriteConflict(exception))
            {
                return Results.Conflict("The planned cost or a related record changed. Refresh before deleting it.");
            }
            return Results.NoContent();
        }).WithName("DeletePlannedCost");

        return app;
    }

    private static object ToResponse(
        PlannedCost cost, Guid? bookingId = null, string? bookingName = null, decimal? bookingPaid = null) => new
    {
        cost.Id,
        cost.TripId,
        cost.Name,
        cost.Category,
        cost.Amount,
        cost.ItemCore.Revision,
        BookingId = bookingId,
        BookingName = bookingName,
        BookingPaid = bookingPaid,
        cost.CreatedAtUtc,
        ExpenseAdded = cost.Expense is not null,
        ExpenseId = cost.Expense?.Id
    };

    /// <summary>Provides a consistent display name when an optional planned-cost name is omitted.</summary>
    private static string NormalizeName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Cost item" : name.Trim();
}
