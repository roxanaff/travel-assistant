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
