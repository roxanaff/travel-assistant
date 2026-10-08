// Reusable button for showing or hiding optional fields in a form.
// The parent owns the open/closed state and the extra fields.
type Props = {
    isExpanded: boolean;
    onToggle: () => void;
    controlsId?: string;
};

/** Renders the shared pink disclosure used for optional form fields. */
export function FormDetailsToggle({ isExpanded, onToggle, controlsId }: Props) {
    return (
        <button
            className="text-button form-details-toggle"
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={controlsId}
        >
            {isExpanded ? "Hide details" : "More details"}
        </button>
    );
}

