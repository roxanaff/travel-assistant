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

