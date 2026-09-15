using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using TravelAssistant.Contracts;
using Xunit;

namespace TravelAssistant.Tests;

public sealed class TodoItemApiTests : IAsyncLifetime
{
    private readonly ApiTestFixture factory = new();

    public async Task InitializeAsync() => await factory.InitializeDatabaseAsync();

    public Task DisposeAsync()
    {
        factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task UserCanCreateTodoItemWithTripStartDateAsDefaultDeadline()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var createTrip = await client.PostAsJsonAsync("/api/trips", new CreateTripRequest(
            "Rome weekend", "Rome", new DateOnly(2027, 4, 2), new DateOnly(2027, 4, 5),
            null, null, 500, "EUR", null));
        var tripLocation = createTrip.Headers.Location;
        Assert.NotNull(tripLocation);

        var createTask = await client.PostAsJsonAsync($"{tripLocation}/todo-items", new CreateTodoItemRequest(
            "Book outbound travel", null, null));

        Assert.Equal(HttpStatusCode.Created, createTask.StatusCode);
        var body = await createTask.Content.ReadAsStringAsync();
        Assert.Contains("Book outbound travel", body);
        Assert.Contains("2027-04-02", body);
    }

    [Fact]
    public async Task ChangingTripDatesKeepsTaskDeadlineAndRequestsReview()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client, new DateOnly(2027, 4, 2), new DateOnly(2027, 4, 5));
        await client.PostAsJsonAsync($"{tripLocation}/todo-items", new CreateTodoItemRequest(
            "Book outbound travel", null, null));

        var updateTrip = await client.PutAsJsonAsync(tripLocation, CreateTripRequest(
            new DateOnly(2027, 4, 3), new DateOnly(2027, 4, 6)));

        Assert.Equal(HttpStatusCode.OK, updateTrip.StatusCode);
        using var updatedTrip = JsonDocument.Parse(await updateTrip.Content.ReadAsStringAsync());
        Assert.True(updatedTrip.RootElement.GetProperty("hasPendingTodoDeadlineReview").GetBoolean());

        var tasks = await client.GetAsync($"{tripLocation}/todo-items");
        using var taskList = JsonDocument.Parse(await tasks.Content.ReadAsStringAsync());
        Assert.Equal("2027-04-02", taskList.RootElement[0].GetProperty("deadline").GetString());
    }

    [Fact]
    public async Task ResetChecklistClearsPendingDeadlineReview()
    {
        using var client = CreateClient();
        await RegisterAsync(client, "Roxi", "roxi@example.com");
        var tripLocation = await CreateTripAsync(client, new DateOnly(2027, 4, 2), new DateOnly(2027, 4, 5));
        await client.PostAsJsonAsync($"{tripLocation}/todo-items", new CreateTodoItemRequest(
            "Book outbound travel", null, null));
        await client.PutAsJsonAsync(tripLocation, CreateTripRequest(
            new DateOnly(2027, 4, 3), new DateOnly(2027, 4, 6)));

        var reset = await client.DeleteAsync($"{tripLocation}/todo-items/reset");

        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        var trip = await client.GetAsync(tripLocation);
        using var tripBody = JsonDocument.Parse(await trip.Content.ReadAsStringAsync());
        Assert.False(tripBody.RootElement.GetProperty("hasPendingTodoDeadlineReview").GetBoolean());
    }

    private static async Task<Uri> CreateTripAsync(HttpClient client, DateOnly startDate, DateOnly endDate)
    {
        var createTrip = await client.PostAsJsonAsync("/api/trips", CreateTripRequest(startDate, endDate));
        var tripLocation = createTrip.Headers.Location;
        Assert.NotNull(tripLocation);

        return tripLocation;
    }

    private static CreateTripRequest CreateTripRequest(DateOnly startDate, DateOnly endDate) => new(
        "Rome weekend", "Rome", startDate, endDate, null, null, 500, "EUR", null);

    private HttpClient CreateClient() => factory.CreateClient(new WebApplicationFactoryClientOptions
    {
        BaseAddress = new Uri("https://localhost"),
        HandleCookies = true,
    });

    private static Task<HttpResponseMessage> RegisterAsync(
        HttpClient client,
        string displayName,
        string email) =>
        client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            displayName,
            email,
            "password123"));
}
