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
        await client.PostAsync($"{tripLocation}/bookings/{bookingId}/planned-costs/{plannedCostId}", null);
        await client.PostAsJsonAsync(
            $"{tripLocation}/expenses",
            new CreateExpenseRequest("Hotel", ExpenseCategory.Accommodation, 200, new DateOnly(2027, 3, 1), plannedCostId));

        var delete = await client.DeleteAsync($"{tripLocation}/bookings/{bookingId}");

        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var activity = await database.ItineraryItems.SingleAsync(item => item.Id == activityId);
        var plannedCost = await database.PlannedCosts.SingleAsync(cost => cost.Id == plannedCostId);
        var expense = await database.Expenses.SingleAsync(item => item.PlannedCostId == plannedCostId);

        Assert.Null(activity.BookingId);
        Assert.True(activity.HasPendingDeletedBookingNotice);
        Assert.Null(plannedCost.BookingId);
        Assert.True(plannedCost.HasPendingDeletedBookingNotice);
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
    public async Task BookingCanCreateLinkedPlannedCost()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");

        var response = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/planned-costs",
            new CreatePlannedCostRequest("  Hotel deposit  ", PlannedCostCategory.Accommodation, 175));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(bookingId, body.RootElement.GetProperty("bookingId").GetGuid());
        Assert.False(body.RootElement.GetProperty("expenseAdded").GetBoolean());
        Assert.Equal(JsonValueKind.Null, body.RootElement.GetProperty("expenseId").ValueKind);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var plannedCost = await database.PlannedCosts.SingleAsync();
        Assert.Equal(bookingId, plannedCost.BookingId);
        Assert.Equal("Hotel deposit", plannedCost.Name);
        Assert.Equal(175, plannedCost.Amount);
    }

    [Fact]
    public async Task AddingBookingExpenseCreatesConnectedBudgetChain()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Rome flights");

        var response = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest(
                new CreatePlannedCostRequest("Flights", PlannedCostCategory.TravelToFrom, 200),
                "Flight payment",
                ExpenseCategory.TravelToFrom,
                150,
                new DateOnly(2027, 3, 1)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var responseExpense = body.RootElement.GetProperty("expense");
        var responsePlannedCost = body.RootElement.GetProperty("plannedCost");
        Assert.Equal(responsePlannedCost.GetProperty("id").GetGuid(), responseExpense.GetProperty("plannedCostId").GetGuid());
        Assert.Equal(bookingId, responsePlannedCost.GetProperty("bookingId").GetGuid());
        Assert.True(responsePlannedCost.GetProperty("expenseAdded").GetBoolean());
        Assert.Equal(responseExpense.GetProperty("id").GetGuid(), responsePlannedCost.GetProperty("expenseId").GetGuid());

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        var expense = await database.Expenses
            .Include(item => item.PlannedCost)
            .SingleAsync();
        Assert.Equal(bookingId, expense.PlannedCost?.BookingId);
        Assert.Equal("Flights", expense.PlannedCost?.Name);
        Assert.Equal("Flight payment", expense.Name);
        Assert.Equal(150, expense.Amount);
    }

    [Fact]
    public async Task AddingBookingExpenseUsesExistingPlanAndRejectsDuplicateExpense()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");

        var plannedCostResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/planned-costs",
            new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, 200));
        Assert.Equal(HttpStatusCode.Created, plannedCostResponse.StatusCode);

        var request = new CreateBookingExpenseRequest(
            null,
            "Hotel payment",
            ExpenseCategory.Accommodation,
            200,
            new DateOnly(2027, 3, 1));
        var firstExpense = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            request);
        var duplicateExpense = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            request);

        Assert.Equal(HttpStatusCode.Created, firstExpense.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateExpense.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Equal(1, await database.PlannedCosts.CountAsync());
        Assert.Equal(1, await database.Expenses.CountAsync());
    }

    [Fact]
    public async Task ExistingBudgetRoutesReturnConflictsForDuplicateBookingRelationships()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");

        var firstPlanResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/planned-costs",
            new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, 200));
        var secondPlanResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/planned-costs",
            new CreatePlannedCostRequest("Extra hotel plan", PlannedCostCategory.Accommodation, 200));
        using var firstPlanBody = JsonDocument.Parse(await firstPlanResponse.Content.ReadAsStringAsync());
        using var secondPlanBody = JsonDocument.Parse(await secondPlanResponse.Content.ReadAsStringAsync());
        var firstPlanId = firstPlanBody.RootElement.GetProperty("id").GetGuid();
        var secondPlanId = secondPlanBody.RootElement.GetProperty("id").GetGuid();

        var firstLink = await client.PostAsync(
            $"{tripLocation}/bookings/{bookingId}/planned-costs/{firstPlanId}",
            null);
        var duplicateLink = await client.PostAsync(
            $"{tripLocation}/bookings/{bookingId}/planned-costs/{secondPlanId}",
            null);

        var expenseRequest = new CreateExpenseRequest(
            "Hotel",
            ExpenseCategory.Accommodation,
            200,
            new DateOnly(2027, 3, 1),
            firstPlanId);
        var firstExpense = await client.PostAsJsonAsync(
            $"{tripLocation}/expenses",
            expenseRequest);
        var duplicateExpense = await client.PostAsJsonAsync(
            $"{tripLocation}/expenses",
            expenseRequest);

        Assert.Equal(HttpStatusCode.OK, firstLink.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateLink.StatusCode);
        Assert.Equal(HttpStatusCode.Created, firstExpense.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateExpense.StatusCode);
    }

    [Fact]
    public async Task FreeBookingCannotCreateBudgetRecords()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);

        var bookingResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings",
            CreateBookingRequest(name: "Free museum", totalCost: 0));
        Assert.Equal(HttpStatusCode.Created, bookingResponse.StatusCode);
        using var bookingBody = JsonDocument.Parse(await bookingResponse.Content.ReadAsStringAsync());
        var bookingId = bookingBody.RootElement.GetProperty("id").GetGuid();

        var response = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/planned-costs",
            new CreatePlannedCostRequest("Museum", PlannedCostCategory.ActivitiesAndMuseums, 20));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Empty(await database.PlannedCosts.ToListAsync());
    }

    [Fact]
    public async Task BookingBudgetCreationRejectsOverlongEditableNames()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client);
        var bookingId = await CreateBookingAsync(client, tripLocation, "Hotel");
        var longName = new string('x', 151);

        var plannedCostResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/planned-costs",
            new CreatePlannedCostRequest(longName, PlannedCostCategory.Accommodation, 200));
        var expenseResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest(
                new CreatePlannedCostRequest("Hotel", PlannedCostCategory.Accommodation, 200),
                longName,
                ExpenseCategory.Accommodation,
                200,
                new DateOnly(2027, 3, 1)));
        var nestedPlannedCostResponse = await client.PostAsJsonAsync(
            $"{tripLocation}/bookings/{bookingId}/expenses",
            new CreateBookingExpenseRequest(
                new CreatePlannedCostRequest(longName, PlannedCostCategory.Accommodation, 200),
                "Hotel",
                ExpenseCategory.Accommodation,
                200,
                new DateOnly(2027, 3, 1)));

        Assert.Equal(HttpStatusCode.BadRequest, plannedCostResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, expenseResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, nestedPlannedCostResponse.StatusCode);

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<TravelAssistantDbContext>();
        Assert.Empty(await database.PlannedCosts.ToListAsync());
        Assert.Empty(await database.Expenses.ToListAsync());
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
        var response = await client.PostAsJsonAsync($"{tripLocation}/bookings", CreateBookingRequest(name: name, totalCost: 200));
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
