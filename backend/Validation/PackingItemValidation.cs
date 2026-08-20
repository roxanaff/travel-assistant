using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

/// <summary>Validates packing-item input before an endpoint changes the database.</summary>
public static class PackingItemValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
    public static string? Validate(string? name, int? quantity)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "A packing item name is required.";
        }

        if (quantity is <= 0)
        {
            return "Packing item quantity must be greater than zero.";
        }

        return null;
    }
}
