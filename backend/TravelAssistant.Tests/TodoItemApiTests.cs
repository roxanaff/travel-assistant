using System.Net;
using System.Net.Http.Json;
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
