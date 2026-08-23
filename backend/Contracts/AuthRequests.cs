namespace TravelAssistant.Contracts;

/// <summary>Information supplied when a new account is created.</summary>
public record RegisterRequest(string? DisplayName, string? Email, string? Password);

/// <summary>Credentials supplied to begin a persistent browser session.</summary>
public record LoginRequest(string? Email, string? Password);

/// <summary>The safe account details returned to the browser; password/security fields are never exposed.</summary>
public record CurrentUserResponse(Guid Id, string DisplayName, string Email);
