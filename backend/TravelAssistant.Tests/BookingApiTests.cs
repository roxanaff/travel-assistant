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
