using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;
using Xunit;

namespace TravelAssistant.Tests;

public sealed class BookingApiTests : IAsyncLifetime
{
    private readonly ApiTestFixture factory = new();

    public async Task InitializeAsync() => await factory.InitializeDatabaseAsync();

    public Task DisposeAsync()
    {
        factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task UserCanCreateRoundTripBookingOutsideTripDates()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);

        var response = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings",
            CreateBookingRequest(
                startDate: new DateOnly(2027, 3, 31),
                returnStartDate: new DateOnly(2027, 4, 6),
                totalCost: 200,
                amountPaid: 50));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("PartiallyPaid", body.RootElement.GetProperty("financialStatus").GetString());
        Assert.Equal("2027-04-06", body.RootElement.GetProperty("returnStartDate").GetString());
    }

    [Theory]
    [InlineData(0, null, "Unpaid")]
    [InlineData(80, null, "PartiallyPaid")]
    [InlineData(150, 0, "Paid")]
    [InlineData(80, 50, "Refunded")]
    [InlineData(80, 80, "Refunded")]
    public async Task CancelledBookingPreservesPaymentStateUnlessMoneyWasRefunded(
        int paid,
        int? refunded,
        string expectedStatus)
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var request = CreateBookingRequest(totalCost: 150, amountPaid: paid) with
        {
            Status = BookingStatus.Cancelled,
            AmountRefunded = refunded,
        };

        var response = await client.PostAsJsonAsync($"{tripLocation}/bookings", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(expectedStatus, body.RootElement.GetProperty("financialStatus").GetString());
        Assert.Equal(paid, body.RootElement.GetProperty("amountPaid").GetDecimal());
        Assert.Equal(paid - (refunded ?? 0), body.RootElement.GetProperty("netCost").GetDecimal());
    }

    [Fact]
    public async Task SavedOutsideTripWarningsPersistDismissalAndReturnAfterDateChanges()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "saved-date-warning@example.com");
        var trip = await CreateTripAsync(client);
        var request = CreateBookingRequest(startDate: new DateOnly(2027, 4, 1), returnStartDate: new DateOnly(2027, 4, 6));
        var created = await ReadJson(await client.PostAsJsonAsync($"{trip}/bookings", request));
        var id = created.GetProperty("id").GetGuid();
        var warning = created.GetProperty("outsideTripWarning");
        Assert.Equal(2, warning.GetProperty("dates").GetArrayLength());
        var key = warning.GetProperty("key").GetString();
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync(
            $"{trip}/bookings/{id}/dismiss-outside-trip-warning", new { Key = key })).StatusCode);
        var saved = await ReadJson(await client.GetAsync($"{trip}/bookings/{id}"));
        Assert.Equal(key, saved.GetProperty("dismissedOutsideTripWarningKey").GetString());
        await client.PutAsJsonAsync($"{trip}/bookings/{id}", request with { Name = "Renamed flight" });
        saved = await ReadJson(await client.GetAsync($"{trip}/bookings/{id}"));
        Assert.Equal(key, saved.GetProperty("dismissedOutsideTripWarningKey").GetString());

        await client.PutAsJsonAsync($"{trip}/bookings/{id}", request with { ReturnStartDate = new DateOnly(2027, 4, 7) });
        saved = await ReadJson(await client.GetAsync($"{trip}/bookings/{id}"));
        Assert.Equal(JsonValueKind.Null, saved.GetProperty("dismissedOutsideTripWarningKey").ValueKind);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(
            $"{trip}/bookings/{id}/dismiss-outside-trip-warning", new { Key = key })).StatusCode);

        using var other = CreateClient();
        await RegisterAsync(other, "Other", "other-date-warning@example.com");
        Assert.Equal(HttpStatusCode.NotFound, (await other.PostAsJsonAsync(
            $"{trip}/bookings/{id}/dismiss-outside-trip-warning", new { Key = key })).StatusCode);

        key = saved.GetProperty("outsideTripWarning").GetProperty("key").GetString();
        await client.PostAsJsonAsync($"{trip}/bookings/{id}/dismiss-outside-trip-warning", new { Key = key });
        await client.PutAsJsonAsync(trip, new CreateTripRequest(
            "Rome weekend", "Rome", new DateOnly(2027, 4, 3), new DateOnly(2027, 4, 5),
            null, null, 500, "EUR", null));
        saved = await ReadJson(await client.GetAsync($"{trip}/bookings/{id}"));
        Assert.Equal(JsonValueKind.Null, saved.GetProperty("dismissedOutsideTripWarningKey").ValueKind);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task QuickPaymentUpdatesOnlyPaidAndUndoClearsUnacceptedFinancialReviews(bool hasExpense)
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "quick-payment@example.com");
        var trip = await CreateTripAsync(client);
        var id = await CreateBookingAsync(client, trip, "Flight");
        if (hasExpense)
        {
            await client.PostAsJsonAsync($"{trip}/bookings/{id}/expenses", new CreateBookingExpenseRequest("Deposit", null, 150, null));
        }
        var booking = await ReadJson(await client.GetAsync($"{trip}/bookings/{id}"));
        var paid = await ReadJson(await SetPayment(client, trip, booking, 200));
        Assert.Equal("Paid", paid.GetProperty("financialStatus").GetString());
        Assert.Equal(200, paid.GetProperty("amountPaid").GetDecimal());
        Assert.Equal(hasExpense ? 1 : 0, (await GetReviews(client, trip)).Length);

        // A payment-only Undo must preserve edits to unrelated booking fields.
        await client.PutAsJsonAsync($"{trip}/bookings/{id}", CreateBookingRequest(name: "Renamed flight", totalCost: 200, amountPaid: 200));
        var undone = await ReadJson(await SetPayment(client, trip, paid, 150));
        Assert.Equal(150, undone.GetProperty("amountPaid").GetDecimal());
        Assert.Equal("Renamed flight", undone.GetProperty("name").GetString());
        Assert.Empty(await GetReviews(client, trip));
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Equal(hasExpense ? 1 : 0, await database.Expenses.CountAsync());
        if (hasExpense) Assert.Equal(150, (await database.Expenses.SingleAsync()).Amount);
    }

    [Fact]
    public async Task QuickPaymentRejectsStaleUndoIneligibleBookingsAndAnotherAccount()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "guarded-payment@example.com");
        var trip = await CreateTripAsync(client);
        var id = await CreateBookingAsync(client, trip, "Flight");
        var booking = await ReadJson(await client.GetAsync($"{trip}/bookings/{id}"));
        var paid = await ReadJson(await SetPayment(client, trip, booking, 200));
        await client.PutAsJsonAsync($"{trip}/bookings/{id}", CreateBookingRequest(totalCost: 220, amountPaid: 200));
        Assert.Equal(HttpStatusCode.Conflict, (await SetPayment(client, trip, paid, 150)).StatusCode);
        var current = await ReadJson(await client.GetAsync($"{trip}/bookings/{id}"));
        Assert.Equal(HttpStatusCode.BadRequest, (await SetPayment(client, trip, current, 221)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await SetPayment(client, trip, current, -1)).StatusCode);
        using var other = CreateClient();
        await RegisterAsync(other, "Other", "other-payment@example.com");
        Assert.Equal(HttpStatusCode.NotFound, (await SetPayment(other, trip, current, 220)).StatusCode);

        foreach (var request in new[]
        {
            CreateBookingRequest(totalCost: 220, amountPaid: 200) with { Status = BookingStatus.Cancelled },
            CreateBookingRequest(totalCost: 0),
            CreateBookingRequest(),
        })
        {
            current = await ReadJson(await client.PutAsJsonAsync($"{trip}/bookings/{id}", request));
            Assert.Equal(HttpStatusCode.Conflict, (await SetPayment(client, trip, current, 0)).StatusCode);
        }
    }

    private static Task<HttpResponseMessage> SetPayment(HttpClient client, Uri trip, JsonElement booking, decimal amount) =>
        client.PostAsJsonAsync($"{trip}/bookings/{booking.GetProperty("id").GetGuid()}/payment", new
        {
            AmountPaid = amount,
            ExpectedAmountPaid = booking.GetProperty("amountPaid").GetDecimal(),
            ExpectedTotalCost = booking.GetProperty("totalCost").ValueKind == JsonValueKind.Null
                ? (decimal?)null : booking.GetProperty("totalCost").GetDecimal(),
            ExpectedStatus = booking.GetProperty("status").GetString(),
            ExpectedAmountRefunded = booking.GetProperty("amountRefunded").ValueKind == JsonValueKind.Null
                ? (decimal?)null : booking.GetProperty("amountRefunded").GetDecimal(),
        });

    [Fact]
    public async Task ActivityCanBelongToOnlyOneBooking()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var activityId = await CreateActivityAsync(client, tripLocation);
        var firstBookingId = await CreateBookingAsync(client, tripLocation, "Outbound flight");
        var secondBookingId = await CreateBookingAsync(client, tripLocation, "Another flight");

        var firstLink = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{firstBookingId}/activities/{activityId}",
            new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        var secondLink = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{secondBookingId}/activities/{activityId}",
            new LinkBookingActivityRequest(BookingActivityRole.Outbound));

        Assert.Equal(HttpStatusCode.OK, firstLink.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, secondLink.StatusCode);
    }

    [Fact]
    public async Task DeletingBookingKeepsLinkedRecordsAndAddsNotices()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var activityId = await CreateActivityAsync(client, tripLocation);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");

        await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/activities/{activityId}",
            new LinkBookingActivityRequest(BookingActivityRole.General));

        var plannedCostResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/planned-costs",
            new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, 200));
        using var plannedCostBody = JsonDocument.Parse(await plannedCostResponse.Content.ReadAsStringAsync());
        var plannedCostId = plannedCostBody.RootElement.GetProperty("id").GetGuid();
        var expenseResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/expenses",
            new CreateExpenseRequest("Hotel", ExpenseCategory.Accommodation, 200, new DateOnly(2027, 3, 1), plannedCostId));
        using var expenseBody = JsonDocument.Parse(await expenseResponse.Content.ReadAsStringAsync());
        var expenseId = expenseBody.RootElement.GetProperty("id").GetGuid();
        var linked = await client.PostAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses/{expenseId}", null);
        Assert.Equal(HttpStatusCode.NoContent, linked.StatusCode);

        var delete = await client.DeleteAsync($"{tripLocation}/bookings/{bookingId}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var activity = await database.ItineraryItems.SingleAsync(item => item.Id == activityId);
        var plannedCost = await database.PlannedCosts.SingleAsync(cost => cost.Id == plannedCostId);
        var expense = await database.Expenses.SingleAsync(item => item.PlannedCostId == plannedCostId);

        Assert.Null(activity.BookingId);
        Assert.True(activity.HasPendingDeletedBookingNotice);
        Assert.Equal(200, plannedCost.Amount);
        Assert.Null(expense.BookingId);
        Assert.True(expense.HasPendingDeletedBookingNotice);
    }

    [Fact]
    public async Task LinkedRecordReviewSurvivesReloadUntilDismissed()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var activityId = await CreateActivityAsync(client, tripLocation);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");

        await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/activities/{activityId}",
            new LinkBookingActivityRequest(BookingActivityRole.General));

        var nameOnlyUpdate = await client.PutAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}",
            CreateBookingRequest(name: "Renamed hotel", totalCost: 200));
        Assert.Equal(HttpStatusCode.OK, nameOnlyUpdate.StatusCode);

        var bookingsBeforeRelevantChange = await client.GetFromJsonAsync<JsonElement>($"{tripLocation}/bookings");
        var activityBeforeRelevantChange = bookingsBeforeRelevantChange[0].GetProperty("activityLinks")[0];
        Assert.False(activityBeforeRelevantChange.GetProperty("hasPendingActivityUpdateReview").GetBoolean());

        var update = await client.PutAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}",
            CreateBookingRequest(
                name: "Renamed hotel",
                startDate: new DateOnly(2027, 4, 3),
                totalCost: 200));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var bookings = await client.GetFromJsonAsync<JsonElement>($"{tripLocation}/bookings");
        var linkedActivity = bookings[0].GetProperty("activityLinks")[0];
        Assert.True(linkedActivity.GetProperty("hasPendingActivityUpdateReview").GetBoolean());

        var dismiss = await client.PostAsync(
            $"{tripLocation}/bookings/{bookingId}/activities/{activityId}/dismiss-activity-update-review",
            null);
        Assert.Equal(HttpStatusCode.NoContent, dismiss.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var activity = await database.ItineraryItems.SingleAsync(item => item.Id == activityId);
        Assert.False(activity.HasPendingActivityUpdateReview);
    }

    [Fact]
    public async Task JourneyLinksAllowMultipleActivitiesAndOnlyFlagTheChangedLeg()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var firstOutboundId = await CreateActivityAsync(client, tripLocation);
        var secondOutboundId = await CreateActivityAsync(client, tripLocation);
        var returnId = await CreateActivityAsync(client, tripLocation);

        var bookingResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings",
            CreateBookingRequest(returnStartDate: new DateOnly(2027, 4, 4)));
        Assert.Equal(HttpStatusCode.Created, bookingResponse.StatusCode);
        using var bookingBody = JsonDocument.Parse(await bookingResponse.Content.ReadAsStringAsync());
        var bookingId = bookingBody.RootElement.GetProperty("id").GetGuid();

        foreach (var activityId in new[] { firstOutboundId, secondOutboundId })
        {
            var linkResponse = await client.PostAsJsonAsync(
                $"{tripLocation}/bookings/{bookingId}/activities/{activityId}",
                new LinkBookingActivityRequest(BookingActivityRole.Outbound));
            Assert.Equal(HttpStatusCode.OK, linkResponse.StatusCode);
        }

        var returnLinkResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/activities/{returnId}",
            new LinkBookingActivityRequest(BookingActivityRole.Return));
        Assert.Equal(HttpStatusCode.OK, returnLinkResponse.StatusCode);

        var updateResponse = await client.PutAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}",
            CreateBookingRequest(returnStartDate: new DateOnly(2027, 4, 5)));
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var bookings = await client.GetFromJsonAsync<JsonElement>($"{tripLocation}/bookings");
        var links = bookings[0].GetProperty("activityLinks").EnumerateArray().ToArray();
        var outboundLinks = links.Where(link => link.GetProperty("role").GetString() == "Outbound");
        var returnLink = links.Single(link => link.GetProperty("role").GetString() == "Return");

        Assert.All(outboundLinks, link =>
            Assert.False(link.GetProperty("hasPendingActivityUpdateReview").GetBoolean()));
        Assert.True(returnLink.GetProperty("hasPendingActivityUpdateReview").GetBoolean());
        Assert.Equal("schedule", returnLink.GetProperty("pendingActivityChangeFields").GetString());
    }

    [Fact]
    public async Task BookingCreatesOneDirectExpenseWithoutCreatingAPlan()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Flights");
        var request = new CreateBookingExpenseRequest(
            "  Flight deposit  ", ExpenseCategory.TravelToFrom, 150, new DateOnly(2027, 3, 1));

        var created = await client.PostAsJsonAsync($"{tripLocation}/bookings/{bookingId}/expenses", request);
        var duplicate = await client.PostAsJsonAsync($"{tripLocation}/bookings/{bookingId}/expenses", request);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        using var body = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        Assert.Equal(bookingId, body.RootElement.GetProperty("bookingId").GetGuid());
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("plannedCostId").ValueKind);
        Assert.Equal("Flight deposit", body.RootElement.GetProperty("name").GetString());
        Assert.Equal(150, body.RootElement.GetProperty("amount").GetDecimal());

        using var bookingBody = JsonDocument.Parse(await client.GetStringAsync(
            $"{tripLocation}/bookings/{bookingId}"));
        Assert.Equal(
            body.RootElement.GetProperty("id").GetGuid(),
            bookingBody.RootElement.GetProperty("expenseId").GetGuid());
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Empty(await database.PlannedCosts.ToListAsync());
        Assert.Single(await database.Expenses.ToListAsync());
    }

    [Fact]
    public async Task ExistingPlanExpenseCanLinkToOneBookingAndUnlinkWithoutChangingThePlan()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var firstBookingId = await CreateBookingAsync(client, tripLocation, "Hotel");
        var secondBookingId = await CreateBookingAsync(client, tripLocation, "Other hotel");
        var planResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/planned-costs",
            new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, 200));
        using var planBody = JsonDocument.Parse(await planResponse.Content.ReadAsStringAsync());
        var planId = planBody.RootElement.GetProperty("id").GetGuid();
        var expenseResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/expenses",
            new CreateExpenseRequest("Deposit", ExpenseCategory.Accommodation, 100, null, planId));
        using var expenseBody = JsonDocument.Parse(await expenseResponse.Content.ReadAsStringAsync());
        var expenseId = expenseBody.RootElement.GetProperty("id").GetGuid();

        var linked = await client.PostAsync(
            $"{tripLocation}/bookings/{firstBookingId}/expenses/{expenseId}", null);
        var duplicate = await client.PostAsync(
            $"{tripLocation}/bookings/{secondBookingId}/expenses/{expenseId}", null);
        Assert.Equal(HttpStatusCode.NoContent, linked.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        // A stale Add expense action on the plan must not create duplicate spending.
        var duplicatePlanExpense = await client.PostAsJsonAsync(
            $"{tripLocation}/expenses",
            new CreateExpenseRequest("Duplicate", null, 100, null, planId));
        Assert.Equal(HttpStatusCode.Conflict, duplicatePlanExpense.StatusCode);

        var unlinked = await client.DeleteAsync(
            $"{tripLocation}/bookings/{firstBookingId}/expenses/{expenseId}");
        Assert.Equal(HttpStatusCode.NoContent, unlinked.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var expense = await database.Expenses.SingleAsync();
        Assert.Null(expense.BookingId);
        Assert.Equal(planId, expense.PlannedCostId);
        Assert.Equal(100, expense.Amount);
        Assert.Single(await database.PlannedCosts.ToListAsync());
    }

    [Fact]
    public async Task DeletingPlanKeepsDirectBookingExpenseLinkAndDeletingExpenseNotifiesBooking()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");
        var plan = await client.PostAsJsonAsync(
            $"{tripLocation}/planned-costs", new CreatePlannedCostRequest("Hotel", null, 200));
        using var planBody = JsonDocument.Parse(await plan.Content.ReadAsStringAsync());
        var planId = planBody.RootElement.GetProperty("id").GetGuid();
        var created = await client.PostAsJsonAsync(
            $"{tripLocation}/expenses", new CreateExpenseRequest("Hotel", null, 200, null, planId));
        using var expenseBody = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var expenseId = expenseBody.RootElement.GetProperty("id").GetGuid();
        await client.PostAsync($"{tripLocation}/bookings/{bookingId}/expenses/{expenseId}", null);

        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"{tripLocation}/planned-costs/{planId}")).StatusCode);
        using var bookingBody = JsonDocument.Parse(await client.GetStringAsync(
            $"{tripLocation}/bookings/{bookingId}"));
        Assert.Equal(expenseId, bookingBody.RootElement.GetProperty("expenseId").GetGuid());

        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"{tripLocation}/expenses/{expenseId}")).StatusCode);
        using var refreshed = JsonDocument.Parse(await client.GetStringAsync(
            $"{tripLocation}/bookings/{bookingId}"));
        Assert.Equal(JsonValueKind.Null, refreshed.RootElement.GetProperty("expenseId").ValueKind);
        Assert.True(refreshed.RootElement.GetProperty("hasPendingDeletedExpenseNotice").GetBoolean());
    }

    [Theory]
    [InlineData(null, 0, null)]
    [InlineData(0, 0, null)]
    [InlineData(200, 0, null)]
    [InlineData(200, 150, 150)]
    public async Task BookingWithoutPositiveNetPaymentCannotCreateOrLinkExpense(
        int? totalCost,
        int amountPaid,
        int? amountRefunded)
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var request = CreateBookingRequest(totalCost: totalCost, amountPaid: amountPaid) with
        {
            Status = amountRefunded is null ? BookingStatus.Confirmed : BookingStatus.Cancelled,
            AmountRefunded = amountRefunded
        };
        var booking = await client.PostAsJsonAsync($"{tripLocation}/bookings", request);
        Assert.Equal(HttpStatusCode.Created, booking.StatusCode);
        using var body = JsonDocument.Parse(await booking.Content.ReadAsStringAsync());
        var bookingId = body.RootElement.GetProperty("id").GetGuid();
        var expense = await client.PostAsJsonAsync(
            $"{tripLocation}/expenses", new CreateExpenseRequest("Separate purchase", null, 50, null, null));
        using var expenseBody = JsonDocument.Parse(await expense.Content.ReadAsStringAsync());
        var expenseId = expenseBody.RootElement.GetProperty("id").GetGuid();

        var created = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest("Payment", null, 50, null));
        var linked = await client.PostAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses/{expenseId}", null);

        Assert.Equal(HttpStatusCode.Conflict, created.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, linked.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Single(await database.Expenses.ToListAsync());
        Assert.Empty(await database.PlannedCosts.ToListAsync());
    }

    [Fact]
    public async Task BookingExpenseRoutesRejectCrossTripLinksAndOtherAccounts()
    {
        using var owner = CreateClient();
        await RegisterAsync(owner, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(owner);
        var otherTrip = await CreateTripAsync(owner);
        var bookingId = await CreateBookingAsync(owner, tripLocation, "Hotel");
        var expense = await owner.PostAsJsonAsync(
            $"{otherTrip}/expenses", new CreateExpenseRequest("Other trip", null, 100, null, null));
        using var expenseBody = JsonDocument.Parse(await expense.Content.ReadAsStringAsync());
        var expenseId = expenseBody.RootElement.GetProperty("id").GetGuid();

        var crossTrip = await owner.PostAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses/{expenseId}", null);
        Assert.Equal(HttpStatusCode.NotFound, crossTrip.StatusCode);

        using var otherUser = CreateClient();
        await RegisterAsync(otherUser, "Other", "other@example.com");
        var create = await otherUser.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest("Hotel", null, 100, null));
        var link = await otherUser.PostAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses/{expenseId}", null);
        var unlink = await otherUser.DeleteAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses/{expenseId}");
        Assert.Equal(HttpStatusCode.NotFound, create.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, link.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unlink.StatusCode);
    }

    [Fact]
    public async Task BookingExpenseCreationRejectsInvalidDetailsWithoutPersistingRecords()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");

        var response = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest(new string('x', 151), ExpenseCategory.Accommodation, 100, null));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Empty(await database.Expenses.ToListAsync());
        Assert.Empty(await database.PlannedCosts.ToListAsync());
    }

    [Fact]
    public async Task FinancialReviewsUpdateOnlyAmountsAndDoNotBounceBack()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var planResponse = await client.PostAsJsonAsync($"{trip}/planned-costs",
            new CreatePlannedCostRequest("Flight budget", PlannedCostCategory.TravelToFrom, 150));
        var plan = await ReadJson(planResponse);
        var expenseResponse = await client.PostAsJsonAsync($"{trip}/expenses",
            new CreateExpenseRequest("Deposit", ExpenseCategory.TravelToFrom, 150, new DateOnly(2027, 3, 1), plan.GetProperty("id").GetGuid()));
        var expense = await ReadJson(expenseResponse);
        var expenseId = expense.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"{trip}/bookings/{bookingId}/expenses/{expenseId}", null)).StatusCode);

        var editResponse = await client.PutAsJsonAsync($"{trip}/expenses/{expenseId}",
            new CreateExpenseRequest("Deposit", ExpenseCategory.TravelToFrom, 170, new DateOnly(2027, 3, 1), plan.GetProperty("id").GetGuid()));
        Assert.Equal(170, (await ReadJson(editResponse)).GetProperty("amount").GetDecimal());
        var reviews = await GetReviews(client, trip);
        Assert.Equal(2, reviews.Length);
        Assert.All(reviews, review => Assert.Equal("Amount", review.GetProperty("changes")[0].GetProperty("field").GetString()));
        var bookingReview = reviews.Single(review => review.GetProperty("targetKind").GetString() == "Booking");
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, bookingReview, "apply")).StatusCode);
        var updatedBooking = await ReadJson(await client.GetAsync($"{trip}/bookings/{bookingId}"));
        Assert.Equal(170, updatedBooking.GetProperty("amountPaid").GetDecimal());
        Assert.Equal(200, updatedBooking.GetProperty("totalCost").GetDecimal());
        Assert.Equal("Flight", updatedBooking.GetProperty("name").GetString());
        Assert.Single(await GetReviews(client, trip));
        var planReview = (await GetReviews(client, trip)).Single();
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, planReview, "apply")).StatusCode);
        Assert.Empty(await GetReviews(client, trip));
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var savedPlan = await database.PlannedCosts.AsNoTracking().SingleAsync(item => item.Id == plan.GetProperty("id").GetGuid());
        Assert.Equal(170, savedPlan.Amount);
        Assert.Equal("Flight budget", savedPlan.Name);

        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(name: "Flight", totalCost: 200, amountPaid: 180));
        var expenseReview = (await GetReviews(client, trip)).Single();
        Assert.Equal("Expense", expenseReview.GetProperty("targetKind").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, expenseReview, "keep")).StatusCode);
        Assert.Empty(await GetReviews(client, trip));
        var keptExpense = await database.Expenses.AsNoTracking().SingleAsync(item => item.Id == expenseId);
        Assert.Equal(170, keptExpense.Amount);
    }

    [Fact]
    public async Task ActivityReviewsRetainFirstBeforeValueAndApplyOnlyChangedFields()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "activity-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(name: "Flight", startDate: new DateOnly(2027, 4, 3), totalCost: 200, amountPaid: 150));
        var oldReview = (await GetReviews(client, trip)).Single();
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(name: "Flight", startDate: new DateOnly(2027, 4, 4), totalCost: 200, amountPaid: 150));
        var review = (await GetReviews(client, trip)).Single();
        var changes = review.GetProperty("changes");
        Assert.Equal(1, changes.GetArrayLength());
        Assert.Equal("Date", changes[0].GetProperty("field").GetString());
        Assert.Equal("2027-04-02", changes[0].GetProperty("before").GetString());
        Assert.Equal("2027-04-04", changes[0].GetProperty("after").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, oldReview, "apply")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, review, "apply")).StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var savedActivity = await database.ItineraryItems.AsNoTracking().SingleAsync(item => item.Id == activityId);
        Assert.Equal(new DateOnly(2027, 4, 4), savedActivity.Date);
        Assert.Equal(new TimeOnly(10, 0), savedActivity.StartTime);
        Assert.Equal(60, savedActivity.DurationMinutes);
        Assert.Equal("Rome airport", savedActivity.Location);
        Assert.Empty(await GetReviews(client, trip));
    }

    [Fact]
    public async Task MismatchedAmountsBlockOverpaymentAndReviewsRespectOwnershipAndUnlinking()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "mismatch-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var response = await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest("Oversized expense", null, 250, null));
        var expense = await ReadJson(response);
        var reviews = await GetReviews(client, trip);
        Assert.Equal(2, reviews.Length);
        var review = reviews.Single(item => item.GetProperty("targetKind").GetString() == "Booking");
        Assert.True(review.GetProperty("isMismatch").GetBoolean());
        Assert.Contains("exceed", review.GetProperty("blockedReason").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, review, "apply")).StatusCode);
        var booking = await ReadJson(await client.GetAsync($"{trip}/bookings/{bookingId}"));
        Assert.Equal(150, booking.GetProperty("amountPaid").GetDecimal());

        using var otherUser = CreateClient();
        await RegisterAsync(otherUser, "Other", "other-reviews@example.com");
        Assert.Equal(HttpStatusCode.NotFound, (await otherUser.GetAsync($"{trip}/linked-record-reviews")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Resolve(otherUser, trip, review, "keep")).StatusCode);
        await client.DeleteAsync($"{trip}/bookings/{bookingId}/expenses/{expense.GetProperty("id").GetGuid()}");
        Assert.Empty(await GetReviews(client, trip));
    }

    [Fact]
    public async Task ApplyingActivityStartChangesPreservesBookingDuration()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "duration-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var request = CreateBookingRequest(totalCost: 200, amountPaid: 150) with
        {
            EndDate = new DateOnly(2027, 4, 3),
            EndTime = new TimeOnly(10, 0)
        };
        var booking = await ReadJson(await client.PostAsJsonAsync($"{trip}/bookings", request));
        var bookingId = booking.GetProperty("id").GetGuid();
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        var changedActivity = new CreateItineraryItemRequest(
            "Airport transfer", new DateOnly(2027, 4, 4), new TimeOnly(11, 0), 60,
            null, null, ItineraryCategory.Other, null, "Rome airport", null, ItineraryPriority.MustDo, null, true);
        await ReadJson(await client.PutAsJsonAsync($"{trip}/itinerary-items/{activityId}", changedActivity));
        var review = (await GetReviews(client, trip)).Single();
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, review, "apply")).StatusCode);
        var updated = await ReadJson(await client.GetAsync($"{trip}/bookings/{bookingId}"));
        Assert.Equal("2027-04-04", updated.GetProperty("startDate").GetString());
        Assert.Equal("11:00:00", updated.GetProperty("startTime").GetString());
        Assert.Equal("2027-04-05", updated.GetProperty("endDate").GetString());
        Assert.Equal("12:00:00", updated.GetProperty("endTime").GetString());
        Assert.Empty(await GetReviews(client, trip));
    }

    [Fact]
    public async Task FinancialReviewsRespectRefundHistoryAndDoNotCreateZeroExpenses()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "refund-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var request = CreateBookingRequest(totalCost: 200, amountPaid: 150) with
        {
            Status = BookingStatus.Cancelled,
            AmountRefunded = 30
        };
        var booking = await ReadJson(await client.PostAsJsonAsync($"{trip}/bookings", request));
        var bookingId = booking.GetProperty("id").GetGuid();
        var expense = await ReadJson(await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest("Net expense", null, 120, null)));
        var expenseId = expense.GetProperty("id").GetGuid();
        await ReadJson(await client.PutAsJsonAsync($"{trip}/expenses/{expenseId}", new CreateExpenseRequest("Net expense", null, 130, null, null)));
        var review = (await GetReviews(client, trip)).Single();
        Assert.Equal(160, review.GetProperty("proposedAmount").GetDecimal());
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, review, "apply")).StatusCode);
        var updated = await ReadJson(await client.GetAsync($"{trip}/bookings/{bookingId}"));
        Assert.Equal(160, updated.GetProperty("amountPaid").GetDecimal());
        Assert.Equal(30, updated.GetProperty("amountRefunded").GetDecimal());
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", request with { AmountPaid = 160, AmountRefunded = 160 });
        var zeroReview = (await GetReviews(client, trip)).Single();
        Assert.Contains("positive", zeroReview.GetProperty("blockedReason").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, zeroReview, "apply")).StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Equal(130, (await database.Expenses.AsNoTracking().SingleAsync(item => item.Id == expenseId)).Amount);
    }

    [Fact]
    public async Task SourceRevertsClearReviewsAndIndependentTargetEditsRequireAFreshDecision()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "conflict-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(startDate: new DateOnly(2027, 4, 3), totalCost: 200, amountPaid: 150));
        Assert.Single(await GetReviews(client, trip));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(totalCost: 200, amountPaid: 150));
        Assert.Empty(await GetReviews(client, trip));
        var reverted = await ReadJson(await client.GetAsync($"{trip}/bookings/{bookingId}"));
        Assert.False(reverted.GetProperty("activityLinks")[0].GetProperty("hasPendingActivityUpdateReview").GetBoolean());

        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(startDate: new DateOnly(2027, 4, 3), totalCost: 200, amountPaid: 150));
        var review = (await GetReviews(client, trip)).Single();
        await client.PutAsJsonAsync($"{trip}/itinerary-items/{activityId}", new CreateItineraryItemRequest(
            "Airport transfer", new DateOnly(2027, 4, 4), new TimeOnly(10, 0), 60,
            null, null, ItineraryCategory.Other, null, "Rome airport", null, ItineraryPriority.MustDo, null, true));
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, review, "apply")).StatusCode);
        var refreshed = (await GetReviews(client, trip)).Single(item => item.GetProperty("targetKind").GetString() == "Activity");
        Assert.Equal(JsonValueKind.Null, refreshed.GetProperty("blockedReason").ValueKind);
        Assert.Equal("2027-04-04", refreshed.GetProperty("changes")[0].GetProperty("targetValue").GetString());
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, refreshed, "apply")).StatusCode);
        Assert.Empty(await GetReviews(client, trip));
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var activity = await database.ItineraryItems.AsNoTracking().SingleAsync(item => item.Id == activityId);
        Assert.Equal(new DateOnly(2027, 4, 3), activity.Date);
        Assert.Equal(new TimeOnly(10, 0), activity.StartTime);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AcceptingEitherCostDirectionKeepsUnrelatedLocationChanges(bool preferBooking)
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "two-sided-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(totalCost: 250, amountPaid: 150));
        await client.PutAsJsonAsync($"{trip}/itinerary-items/{activityId}", new CreateItineraryItemRequest(
            "Airport transfer", new DateOnly(2027, 4, 2), new TimeOnly(10, 0), 60,
            null, null, ItineraryCategory.Other, 190, "New airport", null, ItineraryPriority.MustDo, null, true));

        var reviews = await GetReviews(client, trip);
        Assert.Equal(2, reviews.Length);
        var fromBooking = reviews.Single(item => item.GetProperty("targetKind").GetString() == "Activity");
        Assert.Equal(JsonValueKind.Null, fromBooking.GetProperty("blockedReason").ValueKind);
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, fromBooking, preferBooking ? "apply" : "keep")).StatusCode);
        var remaining = Assert.Single(await GetReviews(client, trip));
        var fields = remaining.GetProperty("changes").EnumerateArray().Select(change => change.GetProperty("field").GetString()).ToArray();
        Assert.Contains("Location", fields);
        if (preferBooking)
        {
            Assert.DoesNotContain("Cost", fields);
            Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, reviews.Single(item => item.GetProperty("targetKind").GetString() == "Booking"), "apply")).StatusCode);
        }
        else
        {
            Assert.Contains("Cost", fields);
            Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, remaining, "apply")).StatusCode);
            Assert.Empty(await GetReviews(client, trip));
        }

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var activity = await database.ItineraryItems.AsNoTracking().SingleAsync(item => item.Id == activityId);
        var booking = await database.Bookings.AsNoTracking().SingleAsync(item => item.Id == bookingId);
        Assert.Equal(preferBooking ? 250 : 190, activity.Cost);
        Assert.Equal(preferBooking ? 250 : 190, booking.TotalCost);
        Assert.Equal("New airport", activity.Location);
        Assert.Equal(preferBooking ? "Berlin" : "New airport", booking.StartLocation);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AcceptedDurationChangesClearReciprocalBookingEndChanges(bool preferBooking)
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "two-sided-duration@example.com");
        var trip = await CreateTripAsync(client);
        var initial = CreateBookingRequest(totalCost: 200, amountPaid: 150) with
        {
            EndDate = new DateOnly(2027, 4, 2),
            EndTime = new TimeOnly(10, 0),
        };
        var booking = await ReadJson(await client.PostAsJsonAsync($"{trip}/bookings", initial));
        var bookingId = booking.GetProperty("id").GetGuid();
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", initial with { EndTime = new TimeOnly(11, 0) });
        await client.PutAsJsonAsync($"{trip}/itinerary-items/{activityId}", new CreateItineraryItemRequest(
            "Airport transfer", new DateOnly(2027, 4, 2), new TimeOnly(10, 0), 90,
            null, null, ItineraryCategory.Other, null, "Rome airport", null, ItineraryPriority.MustDo, null, true));

        var review = (await GetReviews(client, trip)).Single(item =>
            item.GetProperty("sourceKind").GetString() == (preferBooking ? "Booking" : "Activity"));
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, review, "apply")).StatusCode);
        Assert.Empty(await GetReviews(client, trip));
        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var activity = await database.ItineraryItems.AsNoTracking().SingleAsync(item => item.Id == activityId);
        var updated = await database.Bookings.AsNoTracking().SingleAsync(item => item.Id == bookingId);
        Assert.Equal(preferBooking ? 120 : 90, activity.DurationMinutes);
        Assert.Equal(preferBooking ? new TimeOnly(11, 0) : new TimeOnly(10, 30), updated.EndTime);
    }

    [Fact]
    public async Task IndependentlyEditedPaymentsCanBeExplicitlyUpdatedWithoutReciprocalWarnings()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "two-sided-payments@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var expense = await ReadJson(await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest("Deposit", null, 150, null)));
        var expenseId = expense.GetProperty("id").GetGuid();
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(totalCost: 200, amountPaid: 120));
        await client.PutAsJsonAsync($"{trip}/expenses/{expenseId}", new CreateExpenseRequest("Deposit", null, 130, null, null));

        var review = (await GetReviews(client, trip)).Single(item => item.GetProperty("targetKind").GetString() == "Booking");
        Assert.Equal(JsonValueKind.Null, review.GetProperty("blockedReason").ValueKind);
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, review, "apply")).StatusCode);
        Assert.Empty(await GetReviews(client, trip));
        var booking = await ReadJson(await client.GetAsync($"{trip}/bookings/{bookingId}"));
        Assert.Equal(130, booking.GetProperty("amountPaid").GetDecimal());
        Assert.Equal(200, booking.GetProperty("totalCost").GetDecimal());
    }

    [Fact]
    public async Task ReviewUpdatesRespectLinkedExpenseCostAndTripDateGuards()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "guard-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/expenses", new CreateBookingExpenseRequest("Deposit", null, 150, null));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(totalCost: 200, amountPaid: 0));
        await client.PutAsJsonAsync($"{trip}/itinerary-items/{activityId}", new CreateItineraryItemRequest(
            "Airport transfer", new DateOnly(2027, 4, 2), new TimeOnly(10, 0), 60,
            null, null, ItineraryCategory.Other, 0, "Rome airport", null, ItineraryPriority.MustDo, null, true));
        var costReview = (await GetReviews(client, trip)).Single(review => review.GetProperty("targetKind").GetString() == "Booking");
        Assert.Contains("Unlink or delete", costReview.GetProperty("blockedReason").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, costReview, "apply")).StatusCode);

        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(startDate: new DateOnly(2027, 4, 6), totalCost: 200, amountPaid: 0));
        var dateReview = (await GetReviews(client, trip)).Single(review => review.GetProperty("targetKind").GetString() == "Activity");
        Assert.True(dateReview.GetProperty("requiresUnscheduled").GetBoolean());
        Assert.Equal(JsonValueKind.Null, dateReview.GetProperty("blockedReason").ValueKind);
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, dateReview, "apply")).StatusCode);
    }

    [Theory]
    [InlineData("unschedule")]
    [InlineData("keep")]
    public async Task OutsideTripReviewOffersExplicitUnscheduledOrKeepDecision(string action)
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "outside-review@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(
            startDate: new DateOnly(2027, 4, 6), totalCost: 250, amountPaid: 150));

        var review = Assert.Single(await GetReviews(client, trip));
        Assert.True(review.GetProperty("requiresUnscheduled").GetBoolean());
        Assert.Equal(JsonValueKind.Null, review.GetProperty("blockedReason").ValueKind);
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, review, action)).StatusCode);
        Assert.Empty(await GetReviews(client, trip));

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var activity = await database.ItineraryItems.AsNoTracking().SingleAsync(item => item.Id == activityId);
        Assert.Equal(action == "keep" ? new DateOnly(2027, 4, 2) : null, activity.Date);
        Assert.Equal(action == "keep" ? new TimeOnly(10, 0) : null, activity.StartTime);
        Assert.Equal(action == "keep" ? null : 250m, activity.Cost);
        Assert.Equal(60, activity.DurationMinutes);
        Assert.Equal("Rome airport", activity.Location);
        Assert.Equal("Airport transfer", activity.Name);
        Assert.Equal(bookingId, activity.BookingId);
        var booking = await database.Bookings.AsNoTracking().SingleAsync(item => item.Id == bookingId);
        Assert.Equal(new DateOnly(2027, 4, 6), booking.StartDate);
        Assert.Equal(new DateOnly(2027, 4, 5), (await database.Trips.AsNoTracking().SingleAsync()).EndDate);
    }

    [Fact]
    public async Task UnscheduledDecisionRejectsStaleTargetAndCannotBeUsedForAnInTripChange()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "stale-unscheduled@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(
            startDate: new DateOnly(2027, 4, 6), totalCost: 200, amountPaid: 150));
        var stale = Assert.Single(await GetReviews(client, trip));
        await client.PutAsJsonAsync($"{trip}/itinerary-items/{activityId}", new CreateItineraryItemRequest(
            "Renamed transfer", new DateOnly(2027, 4, 2), new TimeOnly(10, 0), 60,
            null, null, ItineraryCategory.Other, null, "Rome airport", null, ItineraryPriority.MustDo, null, true));
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, stale, "unschedule")).StatusCode);
        var refreshed = Assert.Single(await GetReviews(client, trip));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(
            startDate: new DateOnly(2027, 4, 3), totalCost: 200, amountPaid: 150));
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, refreshed, "unschedule")).StatusCode);
        var inTrip = Assert.Single(await GetReviews(client, trip));
        Assert.False(inTrip.GetProperty("requiresUnscheduled").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, (await Resolve(client, trip, inTrip, "unschedule")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await Resolve(client, trip, inTrip, "apply")).StatusCode);
    }

    [Fact]
    public async Task AcceptingConvergedChangesClearsBothLegacyWarningDirections()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "converged-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var activityId = await CreateActivityAsync(client, trip);
        await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/activities/{activityId}", new LinkBookingActivityRequest(BookingActivityRole.Outbound));
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(totalCost: 250, amountPaid: 150));
        await client.PutAsJsonAsync($"{trip}/itinerary-items/{activityId}", new CreateItineraryItemRequest(
            "Airport transfer", new DateOnly(2027, 4, 2), new TimeOnly(10, 0), 60,
            null, null, ItineraryCategory.Other, 250, "Rome airport", null, ItineraryPriority.MustDo, null, true));
        var review = (await GetReviews(client, trip)).Single(item => item.GetProperty("targetKind").GetString() == "Activity");
        var resolved = await Resolve(client, trip, review, "apply");
        Assert.True(resolved.StatusCode == HttpStatusCode.NoContent, await resolved.Content.ReadAsStringAsync());
        Assert.Empty(await GetReviews(client, trip));
        var booking = await ReadJson(await client.GetAsync($"{trip}/bookings/{bookingId}"));
        var link = booking.GetProperty("activityLinks")[0];
        Assert.False(link.GetProperty("hasPendingBookingUpdateReview").GetBoolean());
        Assert.False(link.GetProperty("hasPendingActivityUpdateReview").GetBoolean());
    }

    [Fact]
    public async Task ManuallyMatchingEitherFinancialAmountClearsBothMismatchNotices()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "matched-amount-reviews@example.com");
        var trip = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, trip, "Flight");
        var expense = await ReadJson(await client.PostAsJsonAsync($"{trip}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest("Deposit", null, 100, null)));
        var expenseId = expense.GetProperty("id").GetGuid();
        Assert.Equal(2, (await GetReviews(client, trip)).Length);
        await client.PutAsJsonAsync($"{trip}/bookings/{bookingId}", CreateBookingRequest(totalCost: 200, amountPaid: 100));
        Assert.Empty(await GetReviews(client, trip));

        await client.DeleteAsync($"{trip}/bookings/{bookingId}/expenses/{expenseId}");
        await client.PutAsJsonAsync($"{trip}/expenses/{expenseId}", new CreateExpenseRequest("Deposit", null, 120, null, null));
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"{trip}/bookings/{bookingId}/expenses/{expenseId}", null)).StatusCode);
        Assert.Equal(2, (await GetReviews(client, trip)).Length);
        await client.PutAsJsonAsync($"{trip}/expenses/{expenseId}", new CreateExpenseRequest("Deposit", null, 100, null, null));
        Assert.Empty(await GetReviews(client, trip));
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private static async Task<JsonElement[]> GetReviews(HttpClient client, Uri trip) =>
        (await ReadJson(await client.GetAsync($"{trip}/linked-record-reviews"))).EnumerateArray().ToArray();

    private static Task<HttpResponseMessage> Resolve(HttpClient client, Uri trip, JsonElement review, string action) =>
        client.PostAsJsonAsync($"{trip}/linked-record-reviews/{review.GetProperty("id").GetGuid()}", new
        {
            Revision = review.GetProperty("revision").GetGuid(),
            TargetVersion = review.GetProperty("targetVersion").GetString(),
            Action = action
        });

    private async Task<Uri> CreateTripAsync(HttpClient client)
    {
        var response = await client.PostAsJsonAsync("/api/trips", new CreateTripRequest(
            "Rome weekend",
            "Rome",
            new DateOnly(2027, 4, 2),
            new DateOnly(2027, 4, 5),
            null,
            null,
            500,
            "EUR",
            null));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);
        return response.Headers.Location;
    }

    private static async Task<Guid> CreateActivityAsync(HttpClient client, Uri tripLocation)
    {
        var response = await client.PostAsJsonAsync(
            $"{tripLocation}/itinerary-items",
            new CreateItineraryItemRequest(
                "Airport transfer",
                new DateOnly(2027, 4, 2),
                new TimeOnly(10, 0),
                60,
                null,
                null,
                ItineraryCategory.Other,
                null,
                "Rome airport",
                null,
                ItineraryPriority.MustDo,
                null,
                true));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.GetProperty("id").GetGuid();
    }

    private static async Task<Guid> CreateBookingAsync(HttpClient client, Uri tripLocation, string name)
    {
        var response = await client.PostAsJsonAsync($"{tripLocation}/bookings", CreateBookingRequest(name: name, totalCost: 200, amountPaid: 150));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.GetProperty("id").GetGuid();
    }

    private static SaveBookingRequest CreateBookingRequest(
        string name = "Rome flights",
        DateOnly? startDate = null,
        DateOnly? returnStartDate = null,
        decimal? totalCost = null,
        decimal amountPaid = 0) => new(
            name,
            BookingCategory.Flight,
            BookingStatus.Confirmed,
            "Airline",
            "ABC123",
            startDate ?? new DateOnly(2027, 4, 2),
            new TimeOnly(9, 0),
            null,
            null,
            null,
            "Berlin",
            "Rome",
            returnStartDate,
            null,
            returnStartDate is null ? null : "Rome",
            null,
            null,
            returnStartDate is null ? null : "Berlin",
            null,
            null,
            totalCost,
            amountPaid,
            null);

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        HandleCookies = true,
    });

    private static Task<HttpResponseMessage> RegisterAsync(HttpClient client, string displayName, string email) =>
        client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(displayName, email, "password123"));
}
