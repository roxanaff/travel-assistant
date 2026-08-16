export type BudgetItem = {
    id: string
    tripId: string
    name: string
    category: string
    amount: number
}

export type NewBudgetItemForm = {
    name: string
    category: string
    amount: string
}

export const initialNewBudgetItemForm: NewBudgetItemForm = {
    name: '',
    category: 'Accommodation',
    amount: '',
}
