using TravelAssistant.Validation;
using Xunit;

namespace TravelAssistant.Tests;

public class TodoItemValidationTests
{
    [Fact]
    public void Validate_ReturnsError_WhenNameIsBlank() =>
        Assert.Equal(
            "A to-do task name is required.",
            TodoItemValidation.Validate(" "));

    [Fact]
    public void Validate_ReturnsNull_ForValidTask() =>
        Assert.Null(TodoItemValidation.Validate("Book outbound travel"));
}
