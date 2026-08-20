using TravelAssistant.Models;

namespace TravelAssistant.Contracts;

/// <summary>Payload for creating one manual packing-list item.</summary>
public record CreatePackingItemRequest(
    string Name,
    PackingCategory? Category,
    int? Quantity
);

/// <summary>Payload for changing an item's editable details without changing its order or packed state.</summary>
public record UpdatePackingItemRequest(
    string Name,
    PackingCategory? Category,
    int? Quantity
);

/// <summary>Payload for ticking / unticking an item.</summary>
public record UpdatePackingItemPackedStateRequest(bool IsPacked);

/// <summary>Ordered list of every item ID used to persist a drag-and-drop reorder operation.</summary>
public record ReorderPackingItemsRequest(IReadOnlyList<Guid> ItemIds);
