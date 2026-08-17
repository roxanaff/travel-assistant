export type ItineraryItem = {
  id: string;
  tripId: string;
  name: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  category: string;
  cost: number | null;
  note: string | null;
};

export type ItineraryItemForm = {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
  cost: string;
  note: string;
};

export const createEmptyItineraryItemForm = (
  date: string,
): ItineraryItemForm => ({
  name: "",
  date,
  startTime: "",
  endTime: "",
  category: "Sightseeing",
  cost: "",
  note: "",
});
