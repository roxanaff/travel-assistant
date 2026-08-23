using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Data;

namespace TravelAssistant.Endpoints;

/// <summary>Shared ownership check for every API route nested under one trip.</summary>
public static class TripAccess
{
    /// <summary>Creates an authenticated route group that returns Not Found for trips owned by another user.</summary>
    public static RouteGroupBuilder MapOwnedTripGroup(this IEndpointRouteBuilder app)
    {
        var routes = app.MapGroup("/api/trips/{tripId:guid}").RequireAuthorization();

        routes.AddEndpointFilter(async (context, next) =>
        {
            var tripIdValue = context.HttpContext.Request.RouteValues["tripId"]?.ToString();
            if (!Guid.TryParse(tripIdValue, out var tripId)
                || !context.HttpContext.User.TryGetUserId(out var userId))
            {
                return Results.NotFound();
            }

            var database = context.HttpContext.RequestServices.GetRequiredService<TravelAssistantDbContext>();
            var ownsTrip = await database.Trips.AnyAsync(trip => trip.Id == tripId && trip.UserId == userId);
            return ownsTrip ? await next(context) : Results.NotFound();
        });

        return routes;
    }

    /// <summary>Reads the GUID Identity places in the authenticated user's name-identifier claim.</summary>
    public static bool TryGetUserId(this ClaimsPrincipal principal, out Guid userId) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
}
