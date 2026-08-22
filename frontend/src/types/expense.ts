export type Expense = {
    id: string;
    tripId: string;
    name: string;
    plannedCostId: string | null;
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
