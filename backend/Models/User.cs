using Microsoft.AspNetCore.Identity;

namespace TravelAssistant.Models;

/// <summary>
/// A registered account. ASP.NET Core Identity supplies the email, password-hash, and session-security fields.
/// </summary>
public class User : IdentityUser<Guid>
{
    /// <summary>The name shown in the account menu; it is separate from the email used to sign in.</summary>
    public string DisplayName { get; set; } = string.Empty;

    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public List<Trip> Trips { get; set; } = [];
}
