// One shared upper limit for money amounts accepted by the backend.
// The browser uses the same limit for early form feedback.
namespace TravelAssistant.Validation;

/// <summary>Defines the largest money value supported consistently by browser forms and the API.</summary>
public static class MoneyValidation
{
    public const decimal MaximumAmount = 999_999_999.99m;
}
