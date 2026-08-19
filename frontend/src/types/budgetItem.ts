export type BudgetItem = {
  id: string;
  tripId: string;
  name: string;
  plannedCostId: string | null;
  category: string | null;
  amount: number;
  expenseDate: string | null;
  createdAtUtc: string;
};

export type NewBudgetItemForm = {
  name: string;
  category: string;
  amount: string;
  expenseDate: string;
  plannedCostId: string | null;
};

export const initialNewBudgetItemForm: NewBudgetItemForm = {
  name: "",
  category: "",
  amount: "",
  expenseDate: "",
  plannedCostId: null,
};
