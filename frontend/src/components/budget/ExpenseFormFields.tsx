import { expenseCategories, type NewExpenseForm } from "../../types/expense";
import { FieldLabel, FieldRow } from "../shared/FormPrimitives";

type Props = {
    value: NewExpenseForm;
    currency: string;
    onChange: (field: keyof NewExpenseForm, value: string) => void;
};

/** The same editable expense fields in Expenses and in a booking's prefilled form. */
export function ExpenseFormFields({ value, currency, onChange }: Props) {
    return (
        <>
            <label>
                <FieldLabel>What did you pay for?</FieldLabel>
                <input
                    value={value.name}
                    maxLength={150}
                    onChange={(event) => onChange("name", event.target.value)}
                    placeholder="e.g. Hotel"
                />
            </label>
            <FieldRow>
                <label>
                    <FieldLabel>Category</FieldLabel>
                    <select
                        value={value.category}
                        onChange={(event) => onChange("category", event.target.value)}
                    >
                        <option value="">Not specified</option>
                        {expenseCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    <FieldLabel required>Amount ({currency})</FieldLabel>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={value.amount}
                        onChange={(event) => onChange("amount", event.target.value)}
                        required
                    />
                </label>
                <label>
                    <FieldLabel>Date</FieldLabel>
                    <input
                        type="date"
                        value={value.expenseDate}
                        onChange={(event) => onChange("expenseDate", event.target.value)}
                    />
                </label>
            </FieldRow>
        </>
    );
}
