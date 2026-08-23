using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using TravelAssistant.Contracts;
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
        app.MapPost("/api/auth/change-password", ChangePassword).RequireAuthorization().WithName("ChangePassword");
        app.MapPost("/api/auth/delete-account", DeleteAccount).RequireAuthorization().WithName("DeleteAccount");

        return app;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<User> userManager,
        SignInManager<User> signInManager)
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

        if (!signInResult.Succeeded)
        {
            return Results.Unauthorized();
        }

        return Results.Ok(ToResponse(user));
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

    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest request,
        System.Security.Claims.ClaimsPrincipal principal,
        UserManager<User> userManager,
        SignInManager<User> signInManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        if (string.IsNullOrEmpty(request.CurrentPassword) || string.IsNullOrEmpty(request.NewPassword))
        {
            return Results.BadRequest("Enter your current password and a new password.");
        }

        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            return Results.BadRequest("Could not change your password. Check your current password and try again.");
        }

        // Changing a password invalidates the old security stamp. Reissue this browser's cookie
        // immediately, so this session continues while other signed-in browsers are rejected.
        await signInManager.RefreshSignInAsync(user);
        return Results.NoContent();
    }

    private static async Task<IResult> DeleteAccount(
        DeleteAccountRequest request,
        System.Security.Claims.ClaimsPrincipal principal,
        UserManager<User> userManager,
        SignInManager<User> signInManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        if (string.IsNullOrEmpty(request.Password) || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Results.BadRequest("Your password is incorrect.");
        }

        var result = await userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return Results.Problem("Could not delete your account. Please try again.");
        }

        // The database cascade removes the user's trips and their trip-related records.
        await signInManager.SignOutAsync();
        return Results.NoContent();
    }

    private static CurrentUserResponse ToResponse(User user) =>
        new(user.Id, user.DisplayName, user.Email ?? string.Empty);
}
