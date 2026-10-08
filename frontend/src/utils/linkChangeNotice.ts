// Turns saved change codes such as "schedule" and "location" into a short
// message explaining what changed between a booking and a linked activity.
const labels: Record<string, string> = {
    schedule: "schedule",
    location: "location",
    cost: "cost",
};

export function formatLinkChangeFields(
    value: string | null,
    scheduleLabel = "schedule",
) {
    const fields = (value ?? "")
        .split(",")
        .filter(Boolean)
        .map((field) => field === "schedule" ? scheduleLabel : labels[field] ?? field);

    if (fields.length === 0) return "details";
    if (fields.length === 1) return fields[0];
    if (fields.length === 2) return `${fields[0]} and ${fields[1]}`;
    return `${fields.slice(0, -1).join(", ")}, and ${fields.at(-1)}`;
}
