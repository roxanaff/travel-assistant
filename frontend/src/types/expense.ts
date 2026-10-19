// Frontend shapes for actual spending. Expense is received from the API;
// NewExpenseForm keeps text input values until they are saved.
export type Expense = {
    id: string;
    tripId: string;
    name: string;
    plannedCostId: string | null;
    bookingId: string | null;
    category: string | null;
    amount: number;
    expenseDate: string | null;
    createdAtUtc: string;
};

export type NewExpenseForm = {
    name: string;
    category: string;
    amount: string;
    expenseDate: string;
    plannedCostId: string | null;
};

export const initialNewExpenseForm: NewExpenseForm = {
    name: "",
    category: "",
    amount: "",
    expenseDate: "",
    plannedCostId: null,
};

export const expenseCategories = [
    { value: "TravelToFrom", label: "Travel to/from" },
    { value: "Accommodation", label: "Accommodation" },
    { value: "LocalTransport", label: "Local transport" },
    { value: "Food", label: "Food" },
    { value: "ActivitiesAndMuseums", label: "Activities & museums" },
    { value: "BarsAndNightlife", label: "Bars & nightlife" },
    { value: "Shopping", label: "Shopping" },
    { value: "Other", label: "Other" },
] as const;
