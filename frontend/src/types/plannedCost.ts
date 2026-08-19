export type PlannedCost = {
  id: string;
  tripId: string;
  name: string;
  category: PlannedCostCategory;
  amount: number;
  createdAtUtc: string;
  expenseAdded?: boolean;
};

export type PlannedCostCategory =
  | "TravelToFrom"
  | "Accommodation"
  | "LocalTransport"
  | "Food"
  | "ActivitiesAndMuseums"
  | "BarsAndNightlife"
  | "Shopping"
  | "EmergencyBuffer"
  | "Other";

export type PlannedCostForm = {
  name: string;
  category: "" | PlannedCostCategory;
  amount: string;
};

export const plannedCostCategories: Array<{
  value: PlannedCostCategory;
  label: string;
}> = [
  { value: "TravelToFrom", label: "Travel to/from" },
  { value: "Accommodation", label: "Accommodation" },
  { value: "LocalTransport", label: "Local transport" },
  { value: "Food", label: "Food" },
  { value: "ActivitiesAndMuseums", label: "Activities & museums" },
  { value: "BarsAndNightlife", label: "Bars & nightlife" },
  { value: "Shopping", label: "Shopping" },
  { value: "EmergencyBuffer", label: "Emergency buffer" },
  { value: "Other", label: "Other" },
];

export const createEmptyPlannedCostForm = (
  category: PlannedCostForm["category"] = "",
): PlannedCostForm => ({
  name: "",
  category,
  amount: "",
});
