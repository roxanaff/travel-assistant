export type TripStatus = "Draft" | "Upcoming" | "Ongoing" | "Past";

export type Trip = {
  id: string;
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  arrivalTime: string | null;
  type: string | null;
  budget: number | null;
  currency: string;
  note: string | null;
  createdAtUtc: string;
  status: TripStatus;
};

export type TripFormValues = {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  arrivalTime: string;
  type: string;
  budget: string;
  currency: string;
  note: string;
};

export type TripRequest = {
  name: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  arrivalTime: string | null;
  type: string | null;
  budget: number | null;
  currency: string;
  note: string | null;
};

export const initialTripFormValues: TripFormValues = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  arrivalTime: "",
  type: "",
  budget: "",
  currency: "EUR",
  note: "",
};

export const tripToFormValues = (trip: Trip): TripFormValues => ({
  name: trip.name,
  destination: trip.destination ?? "",
  startDate: trip.startDate ?? "",
  endDate: trip.endDate ?? "",
  arrivalTime: trip.arrivalTime?.slice(0, 5) ?? "",
  type: trip.type ?? "",
  budget: trip.budget?.toString() ?? "",
  currency: trip.currency,
  note: trip.note ?? "",
});
