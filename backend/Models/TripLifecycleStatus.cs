// Names the trip statuses shown to users. A trip's current status is worked
// out from its details rather than saved as a separate database value.
namespace TravelAssistant.Models;

/// <summary>
/// A calculated display status derived from a trip's destination and dates; it is not stored in the database.
/// </summary>
public enum TripLifecycleStatus
{
    Draft,
    Upcoming,
    Ongoing,
    Past
}
