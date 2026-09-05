namespace TravelAssistant.Validation;

/// <summary>Validates to-do task input before an endpoint changes the database.</summary>
public static class TodoItemValidation
{
    /// <summary>Returns a user-facing validation message, or <c>null</c> when the request is valid.</summary>
    public static string? Validate(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "A to-do task name is required.";
        }

        return null;
    }
}
