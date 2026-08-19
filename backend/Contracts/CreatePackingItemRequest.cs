using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

public record CreatePackingItemRequest(
    string Name,
    PackingCategory? Category,
    int? Quantity
);

public record UpdatePackingItemRequest(
    string Name,
    PackingCategory? Category,
    int? Quantity
);

public record UpdatePackingItemPackedStateRequest(bool IsPacked);

public record ReorderPackingItemsRequest(IReadOnlyList<Guid> ItemIds);