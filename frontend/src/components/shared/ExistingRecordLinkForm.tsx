// Shared controls for choosing an existing record to link, with an optional
// second choice such as a role. The parent performs the API request.
import "./ExistingRecordLinkForm.css";

export interface ExistingRecordLinkOption {
    value: string;
    label: string;
}

interface ExistingRecordLinkSelect {
    ariaLabel: string;
    value: string;
    options: ExistingRecordLinkOption[];
    onChange: (value: string) => void;
}

interface ExistingRecordLinkFormProps extends ExistingRecordLinkSelect {
    placeholder: string;
    actionLabel: string;
    pendingActionLabel: string;
    isPending: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    secondarySelect?: ExistingRecordLinkSelect;
}

/** Shared selector and actions for linking existing records across workspace sections. */
export function ExistingRecordLinkForm({
    ariaLabel,
    value,
    options,
    onChange,
    placeholder,
    actionLabel,
    pendingActionLabel,
    isPending,
    onSubmit,
    onCancel,
    secondarySelect,
}: ExistingRecordLinkFormProps) {
    return (
        <div className="existing-record-link-form">
            <select
                className="existing-record-link-select"
                aria-label={ariaLabel}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            >
                <option value="" disabled hidden>{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {secondarySelect && (
                <select
                    className="existing-record-link-secondary-select"
                    aria-label={secondarySelect.ariaLabel}
                    value={secondarySelect.value}
                    onChange={(event) => secondarySelect.onChange(event.target.value)}
                >
                    {secondarySelect.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            )}
            <div className="existing-record-link-actions">
                <button
                    className="primary-button"
                    type="button"
                    disabled={!value || isPending}
                    onClick={onSubmit}
                >
                    {isPending ? pendingActionLabel : actionLabel}
                </button>
                <button
                    className="text-button"
                    type="button"
                    disabled={isPending}
                    onClick={onCancel}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
