# Packing Checklist — Stage 1 Requirements

## Purpose

The packing checklist is a manual, trip-specific list that works for Draft, Upcoming, Ongoing, and Past trips.

## Product behavior

- Each item has a required name, optional category, optional quantity, packed state, and saved manual order.
- Quantity defaults to one and is displayed only when greater than one.
- Categories are Documents & money, Toiletries, Clothing, Electronics, Health, and Other.
- One underlying checklist is displayed as **To pack** and **Packed** sections. Toggling packed state moves an item between sections without changing its saved order.
- Progress is based on checklist-item count rather than the sum of quantities.
- The standard display preserves manual order and shows an optional category label. A grouping option groups each section by category.
- Items can be reordered within To pack and Packed using drag and drop or keyboard-accessible Move up/Move down controls.
- Items can be added, edited, and deleted. Deletion is optimistic, has a five-second Undo period, and restores the item if the API deletion fails.

### Empty checklist

An empty checklist offers **Use default list** or **Start empty**. Default items are copied into the trip and remain fully editable:

| Category | Default items |
| --- | --- |
| Documents & money | Passport/ID, Wallet/cards/cash, Tickets/reservations, Keys |
| Toiletries | Toothbrush, Toothpaste, Deodorant |
| Clothing | Underwear, Socks, Sleepwear |
| Electronics | Phone charger |
| Health | Regular medication |

The default list deliberately does not include a phone.

## Open Stage 1 work

Cross-cutting keyboard and responsive improvements are recorded in [experience and quality requirements](experience-and-quality-requirements.md).

## Verification

- [ ] Verify Draft and dated trips, default-list creation, and starting empty.
- [ ] Verify quantities of one and greater than one; check/uncheck behavior; progress; ordering; and grouping.
- [ ] Verify editing, deletion, Undo expiry, API failure recovery, narrow/mobile layouts, and keyboard interaction.

## Beyond Stage 1

Future packing directions are recorded in [budget and packing](../future/budget-and-packing.md).
