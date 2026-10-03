import { ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";

type Props = {
    itemName: string;
    hasAdditionalDetails: boolean;
    isExpanded: boolean;
    detailsId?: string;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
};

/** Keeps expandable-card actions consistent across itinerary and booking cards. */
export function ExpandableCardActions({
    itemName,
    hasAdditionalDetails,
    isExpanded,
    detailsId,
    onToggle,
    onEdit,
    onDelete,
}: Props) {
    return (
        <div className="item-actions expandable-card-actions">
            {hasAdditionalDetails && (
                <button
                    className="icon-button"
                    type="button"
                    onClick={onToggle}
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} ${itemName} details`}
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    title={isExpanded ? "Collapse details" : "Expand details"}
                >
                    {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </button>
            )}
            <button
                className="icon-button"
                type="button"
                onClick={onEdit}
                aria-label={`Edit ${itemName}`}
                title={`Edit ${itemName}`}
            >
                <Pencil size={17} />
            </button>
            <button
                className="icon-button danger-button"
                type="button"
                onClick={onDelete}
                aria-label={`Delete ${itemName}`}
                title={`Delete ${itemName}`}
            >
                <Trash2 size={17} />
            </button>
        </div>
    );
}

