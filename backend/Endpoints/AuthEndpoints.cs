using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Contracts;
using TravelAssistant.Data;
using TravelAssistant.Models;

namespace TravelAssistant.Endpoints;

/// <summary>Defines registration, browser-session, and current-account API routes.</summary>
public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/auth/register", Register).AllowAnonymous().WithName("Register");
        app.MapPost("/api/auth/login", Login).AllowAnonymous().WithName("Login");
        app.MapPost("/api/auth/logout", Logout).RequireAuthorization().WithName("Logout");
        app.MapGet("/api/auth/me", GetCurrentUser).RequireAuthorization().WithName("GetCurrentUser");

        return app;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        TravelAssistantDbContext database,
        IConfiguration configuration)
    {
        var displayName = request.DisplayName?.Trim();
        var email = request.Email?.Trim();

        if (string.IsNullOrWhiteSpace(displayName))
        {
            return Results.BadRequest("Enter your name.");
        }

        if (displayName.Length > 100)
        {
            return Results.BadRequest("Your name must be 100 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(email) || !new EmailAddressAttribute().IsValid(email))
        {
            return Results.BadRequest("Enter a valid email address.");
        }

        if (string.IsNullOrEmpty(request.Password))
        {
            return Results.BadRequest("Enter a password.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            DisplayName = displayName,
            UserName = email,
            Email = email,
        };

        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            // Do not reveal whether this email already has an account.
            return Results.BadRequest("Could not create an account with those details.");
        }

        await AssignExistingTripsToInitialOwner(user, userManager, database, configuration);
        await signInManager.SignInAsync(user, isPersistent: true);

        return Results.Created("/api/auth/me", ToResponse(user));
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        UserManager<User> userManager,
        SignInManager<User> signInManager)
    {
        var email = request.Email?.Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(request.Password))
        {
            return Results.Unauthorized();
        }

        var user = await userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        var signInResult = await signInManager.PasswordSignInAsync(
            user,
            request.Password,
            isPersistent: true,
            lockoutOnFailure: false);

        return signInResult.Succeeded
            ? Results.Ok(ToResponse(user))
            : Results.Unauthorized();
    }

    private static async Task<IResult> Logout(SignInManager<User> signInManager)
    {
        await signInManager.SignOutAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> GetCurrentUser(
        System.Security.Claims.ClaimsPrincipal principal,
        UserManager<User> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        return user is null ? Results.Unauthorized() : Results.Ok(ToResponse(user));
    }

    /// <summary>
    /// Gives the current pre-account trips to the configured initial account. Once assigned, they
    /// no longer have a null UserId and therefore cannot be assigned again.
    /// </summary>
    private static async Task AssignExistingTripsToInitialOwner(
        User user,
        UserManager<User> userManager,
        TravelAssistantDbContext database,
        IConfiguration configuration)
    {
        var initialOwnerEmail = configuration["InitialTripOwnerEmail"]?.Trim();
        if (string.IsNullOrWhiteSpace(initialOwnerEmail)
            || !string.Equals(user.NormalizedEmail, userManager.NormalizeEmail(initialOwnerEmail), StringComparison.Ordinal))
        {
            return;
        }

        await database.Trips
            .Where(trip => trip.UserId == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(trip => trip.UserId, user.Id));
    }

    private static CurrentUserResponse ToResponse(User user) =>
        new(user.Id, user.DisplayName, user.Email ?? string.Empty);
}
