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
