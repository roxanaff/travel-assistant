import { plannedCostCategories, type PlannedCostForm } from "../../types/plannedCost";
import { FieldLabel, FieldRow } from "../shared/FormPrimitives";

type Props = {
    value: PlannedCostForm;
    currency: string;
    onChange: (field: keyof PlannedCostForm, value: string) => void;
    sharedAmount?: boolean;
    disabled?: boolean;
};

export function PlannedCostFormFields({
    value,
    currency,
    onChange,
    sharedAmount = false,
    disabled = false,
}: Props) {
    return (
        <>
            <label>
                <FieldLabel>Name</FieldLabel>
                <input
                    value={value.name}
                    onChange={(event) => onChange("name", event.target.value)}
                    placeholder="Cost item"
                    disabled={disabled}
                />
            </label>
            <FieldRow>
                <label>
                    <FieldLabel required={!sharedAmount}>
                        {sharedAmount ? "Booking total" : "Amount"} ({currency})
                    </FieldLabel>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={value.amount}
                        onChange={(event) => onChange("amount", event.target.value)}
                        readOnly={sharedAmount}
                        disabled={disabled}
                        required={!sharedAmount}
                    />
                </label>
                <label>
                    <FieldLabel>Category</FieldLabel>
                    <select
                        value={value.category}
                        disabled={disabled}
                        onChange={(event) => onChange("category", event.target.value)}
                    >
                        <option value="">Not specified</option>
                        {plannedCostCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </label>
            </FieldRow>
        </>
    );
}
