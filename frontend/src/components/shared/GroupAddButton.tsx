import { Plus } from "lucide-react";

type Props = {
    label: string;
    onClick: () => void;
};

/** Adds an item to the category, date, or other group named by its accessible label. */
export function GroupAddButton({ label, onClick }: Props) {
    return (
        <button className="icon-button" type="button" onClick={onClick} aria-label={label} title={label}>
            <Plus size={17} />
        </button>
    );
}
