using TravelAssistant.Contracts;

namespace TravelAssistant.Validation;

/// <summary>
/// Validates packing-item requests before they are saved.
/// </summary>
public static class PackingItemValidation
{
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
