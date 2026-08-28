using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using TravelAssistant.Contracts;
using Xunit;

namespace TravelAssistant.Tests;

public sealed class AuthenticatedTripApiTests : IAsyncLifetime
{
    private readonly ApiTestFixture factory = new();

    public async Task InitializeAsync() => await factory.InitializeDatabaseAsync();

    public Task DisposeAsync()
    {
        factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task RegisteredUserCanCreateAndReadTheirTrip()
    {
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });

        var registration = await RegisterAsync(client, "Roxi", "roxi@example.com");
        Assert.Equal(HttpStatusCode.Created, registration.StatusCode);

        var create = await client.PostAsJsonAsync("/api/trips", new CreateTripRequest(
            "Rome weekend", "Rome", new DateOnly(2027, 4, 2), new DateOnly(2027, 4, 5),
            null, null, 500, "EUR", null));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var trips = await client.GetAsync("/api/trips");
        Assert.Equal(HttpStatusCode.OK, trips.StatusCode);
        var body = await trips.Content.ReadAsStringAsync();
        Assert.Contains("Rome weekend", body);
    }

    [Fact]
    public async Task UsersCannotReadAnotherUsersTrip()
    {
        using var firstClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });
        await RegisterAsync(firstClient, "Roxi", "roxi@example.com");
        var create = await firstClient.PostAsJsonAsync("/api/trips", new CreateTripRequest(
            "Private trip", null, null, null, null, null, null, "EUR", null));
        var location = create.Headers.Location;
        Assert.NotNull(location);

        using var secondClient = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });
        await RegisterAsync(secondClient, "Another user", "another@example.com");

        var response = await secondClient.GetAsync(location);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static Task<HttpResponseMessage> RegisterAsync(
        HttpClient client,
        string displayName,
        string email) =>
        client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(
            displayName,
            email,
            "password123"));
}
