type Props = {
    message: string;
    onUndo: () => void;
};

/** Gives optimistic deletion the same short, reversible action across features. */
export function UndoToast({ message, onUndo }: Props) {
    return (
        <button className="undo-toast" type="button" onClick={onUndo}>
            <span>{message}</span>
            <strong>Undo</strong>
        </button>
    );
}
