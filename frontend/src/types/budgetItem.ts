export type BudgetItem = {
  id: string;
  tripId: string;
  name: string;
  category: string;
  amount: number;
  expenseDate: string | null;
};

export type NewBudgetItemForm = {
  name: string;
  category: string;
  amount: string;
  expenseDate: string;
};

export const initialNewBudgetItemForm: NewBudgetItemForm = {
  name: "",
  category: "Accommodation",
  amount: "",
  expenseDate: "",
};
