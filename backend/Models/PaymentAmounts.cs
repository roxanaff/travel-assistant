namespace TravelAssistant.Models;

/// <summary>Represents amounts paid and refunded, with net spending derived from both.</summary>
public readonly record struct PaymentAmounts(decimal Paid, decimal Refunded)
{
    public decimal Net => Paid - Refunded;
}
