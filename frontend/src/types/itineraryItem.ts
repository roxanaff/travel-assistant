export type ItineraryItem = {
    id: string;
    tripId: string;
    name: string;
    date: string | null;
    startTime: string | null;
    durationMinutes: number | null;
    openingTime: string | null;
    closingTime: string | null;
    category: string | null;
    cost: number | null;
    location: string | null;
    externalLink: string | null;
    priority: string;
    note: string | null;
    createdAtUtc: string;
};

export type ItineraryItemForm = {
    name: string;
    date: string;
    startTime: string;
    duration: string;
    openingTime: string;
    closingTime: string;
    category: string;
    cost: string;
    location: string;
    externalLink: string;
    priority: string;
    note: string;
};

/** Returns a fresh form object so separate create/edit panels never share mutable state. */
export const createEmptyItineraryItemForm = (): ItineraryItemForm => ({
    name: "",
    date: "",
    startTime: "",
    duration: "",
    openingTime: "",
    closingTime: "",
    category: "",
    cost: "",
    location: "",
    externalLink: "",
    priority: "WouldLikeToDo",
    note: "",
});
