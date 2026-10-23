using System.Data;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TravelAssistant.Data;
using TravelAssistant.Models;
using TravelAssistant.Services;

namespace TravelAssistant.Endpoints;

public sealed record ResolveLinkedReviewRequest(Guid Revision, string Action, string? TargetVersion);

public static class LinkedRecordReviewEndpoints
{
    public static IEndpointRouteBuilder MapLinkedRecordReviewEndpoints(this IEndpointRouteBuilder app)
    {
        var routes = app.MapOwnedTripGroup();
        routes.MapGet("/linked-record-reviews", async (Guid tripId, TravelAssistantDbContext database) =>
        {
            var reviews = await database.LinkedRecordReviews.Where(item => item.TripId == tripId).ToListAsync();
            var responses = new List<object>();
            foreach (var review in reviews)
            {
                var edge = await LinkedRecordReviews.LoadEdge(database, review);
                // Deleted/unlinked records no longer have a relationship to review.
                if (edge is null) continue;
                var target = database.Entry(edge.Target);
                var original = target.CurrentValues.Clone();
                var requiresUnscheduled = await LinkedRecordReviews.NeedsUnscheduledAsync(database, review, edge);
                var blocked = await LinkedRecordReviews.ApplyAsync(database, review, edge, requiresUnscheduled);
                target.CurrentValues.SetValues(original);
                responses.Add(LinkedRecordReviews.Response(database, review, edge, blocked, requiresUnscheduled));
            }
            return Results.Ok(responses);
        }).WithName("GetLinkedRecordReviews");

        routes.MapPost("/linked-record-reviews/{id:guid}", async (
            Guid tripId,
            Guid id,
            ResolveLinkedReviewRequest request,
            TravelAssistantDbContext database) =>
        {
            if (request.Action is not "apply" and not "keep" and not "unschedule")
                return Results.BadRequest("Choose update or keep as is.");

            await using var transaction = database.Database.IsRelational()
                ? await database.Database.BeginTransactionAsync(IsolationLevel.Serializable)
                : null;
            var review = await database.LinkedRecordReviews.SingleOrDefaultAsync(item => item.TripId == tripId && item.Id == id);
            if (review is null) return Results.NotFound();
            if (review.Revision != request.Revision)
                return Results.Conflict("This linked record changed again. Refresh the notice before deciding.");

            var edge = await LinkedRecordReviews.LoadEdge(database, review);
            if (edge is null) return Results.Conflict("These records are no longer linked. Refresh the page.");
            if (request.Action is "apply" or "unschedule")
            {
                if (request.TargetVersion != LinkedRecordReviews.TargetVersion(database, edge.Target))
                    return Results.Conflict("This record changed again. Refresh the notice before updating it.");
                var makeUnscheduled = request.Action == "unschedule";
                if (makeUnscheduled && !await LinkedRecordReviews.NeedsUnscheduledAsync(database, review, edge))
                    return Results.Conflict("This activity no longer needs to become unscheduled. Refresh the notice.");
                var blocked = await LinkedRecordReviews.ApplyAsync(database, review, edge, makeUnscheduled);
                if (blocked is not null) return Results.Conflict(blocked);
                await LinkedRecordReviews.TrackAsync(database, edge.Target, review.SourceId);
                var oppositeStillPending = await ClearReciprocalFields(database, review, makeUnscheduled);
                if (!oppositeStillPending) ClearLegacyFlag(edge, review.SourceKind);
            }

            ClearLegacyFlag(edge, review.TargetKind);
            database.LinkedRecordReviews.Remove(review);
            try
            {
                await database.SaveChangesAsync();
                if (transaction is not null) await transaction.CommitAsync();
            }
            catch (DbUpdateException)
            {
                return Results.Conflict("A linked record changed while this update was being saved. Refresh and try again.");
            }
            return Results.NoContent();
        }).WithName("ResolveLinkedRecordReview");
        return app;
    }

    private static void ClearLegacyFlag(LinkedRecordReviews.Edge edge, LinkedRecordKind target)
    {
        if (edge.Activity is not ItineraryItem activity) return;
        if (target == LinkedRecordKind.Activity)
        {
            activity.HasPendingActivityUpdateReview = false;
            activity.PendingActivityChangeFields = null;
        }
        else
        {
            activity.HasPendingBookingUpdateReview = false;
            activity.PendingBookingChangeFields = null;
        }
    }

    private static async Task<bool> ClearReciprocalFields(
        TravelAssistantDbContext database,
        LinkedRecordReview review,
        bool makeUnscheduled)
    {
        var opposite = await database.LinkedRecordReviews.SingleOrDefaultAsync(item =>
            item.TripId == review.TripId && item.SourceId == review.TargetId && item.TargetId == review.SourceId);
        // Legacy notices without exact history cannot safely be acknowledged implicitly.
        if (opposite is null) return true;
        var appliedFields = LinkedRecordReviews.ReadChanges(review).Select(change => change.Field).ToHashSet();
        if (makeUnscheduled)
        {
            appliedFields.Add("Date");
            appliedFields.Add("Time");
        }
        // Booking end fields and activity duration represent the same accepted schedule change.
        if (appliedFields.Contains("Duration"))
        {
            appliedFields.Add("EndDate");
            appliedFields.Add("EndTime");
        }
        else if (appliedFields.Contains("EndDate") || appliedFields.Contains("EndTime"))
        {
            appliedFields.Add("Duration");
        }
        var remaining = LinkedRecordReviews.ReadChanges(opposite).Where(change => !appliedFields.Contains(change.Field)).ToList();
        if (remaining.Count == 0)
        {
            database.LinkedRecordReviews.Remove(opposite);
            return false;
        }
        else
        {
            opposite.ChangesJson = JsonSerializer.Serialize(remaining);
            opposite.Revision = Guid.NewGuid();
            return true;
        }
    }
}
