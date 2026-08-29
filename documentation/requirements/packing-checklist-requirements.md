# Packing Checklist — Stage 1 Requirements

## Purpose

The packing checklist is a manual, trip-specific list that works for Draft, Upcoming, Ongoing, and Past trips.

## Product behavior

- Each item has a required name, optional category, optional quantity, packed state, and saved manual order.
- Quantity defaults to one and is displayed only when greater than one.
- Categories are Documents & money, Toiletries, Clothing, Electronics, Health, and Other.
- One underlying checklist is displayed as **To pack** and **Packed** sections. Toggling packed state moves an item
  between sections without changing its saved order.
- Progress is based on checklist-item count rather than the sum of quantities.
- The standard display preserves manual order and shows an optional category label. An inline Group by control switches
  each section between ungrouped and category views.
- To pack and Packed appear side by side on desktop and stack on narrow screens.
- Items can be reordered only from the six-dot grip within their current To pack or Packed section. A mouse drag begins
  after a short movement; touch drag begins after a 200 ms hold.
- While reordering, the item follows the pointer as a semi-transparent full-width row and leaves a placeholder at its
  original position. A single blue insertion line identifies a valid position between items. Drops in empty space or the
  other packed-state section restore the original order.
- Checkboxes and their labels use a pointer cursor to signal that packed state can be toggled.
- Items can be added, edited, and deleted. Deletion is optimistic, has a five-second Undo period, and restores the item
  if the API deletion fails.

### Empty checklist

An empty checklist offers **Use default list** or **Start empty**. Default items are copied into the trip and remain
fully editable:

| Category          | Default items                                              |
| ----------------- | ---------------------------------------------------------- |
| Documents & money | Passport/ID, Wallet/cards/cash, Tickets/reservations, Keys |
| Toiletries        | Toothbrush, Toothpaste, Deodorant                          |
| Clothing          | Underwear, Socks, Sleepwear                                |
| Electronics       | Phone charger                                              |
| Health            | Regular medication                                         |

The default list deliberately does not include a phone.

## Open Stage 1 work

No additional packing-specific behavior is currently planned for Stage 1. Cross-cutting keyboard, responsive, and manual
verification work is recorded in [experience and quality requirements](experience-and-quality-requirements.md).

## Verification

- [ ] Verify Draft and dated trips, default-list creation, and starting empty.
- [ ] Verify quantities of one and greater than one; check/uncheck behavior; progress; ordering; and grouping.
- [ ] Verify editing, deletion, Undo expiry, API failure recovery, narrow/mobile layouts, and keyboard interaction.

## Beyond Stage 1

Future packing directions are recorded in [budget and packing](../future/budget-and-packing.md).
