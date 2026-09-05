export type TodoCategory =
    | "TravelAndTransport"
    | "Accommodation"
    | "DocumentsAndMoney"
    | "BookingsAndActivities"
    | "Health"
    | "Connectivity"
    | "BeforeLeaving"
    | "Other";

export type TodoItem = {
    id: string;
    tripId: string;
    name: string;
    category: TodoCategory | null;
    deadline: string | null;
    isCompleted: boolean;
    sortOrder: number;
    createdAtUtc: string;
};

export type TodoItemForm = {
    name: string;
    category: "" | TodoCategory;
    deadline: string;
};

/** Returns a fresh form object for a new to-do task. */
export const createEmptyTodoItemForm = (): TodoItemForm => ({
    name: "",
    category: "",
    deadline: "",
});

export const todoCategories: Array<{
    value: TodoCategory;
    label: string;
}> = [
    { value: "TravelAndTransport", label: "Travel & transport" },
    { value: "Accommodation", label: "Accommodation" },
    { value: "DocumentsAndMoney", label: "Documents & money" },
    { value: "BookingsAndActivities", label: "Bookings & activities" },
    { value: "Health", label: "Health" },
    { value: "Connectivity", label: "Connectivity" },
    { value: "BeforeLeaving", label: "Before leaving" },
    { value: "Other", label: "Other" },
];
