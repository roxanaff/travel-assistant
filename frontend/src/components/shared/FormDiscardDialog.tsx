import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm: () => void;
};

/** Confirms abandoning changed form values using the application's shared dialog. */
export function FormDiscardDialog({ isOpen, onCancel, onConfirm }: Props) {
    return (
        <ConfirmDialog
            isOpen={isOpen}
            title="Discard unsaved changes?"
            confirmLabel="Discard changes"
            onCancel={onCancel}
            onConfirm={onConfirm}
        >
            <p>Your changes will be lost.</p>
        </ConfirmDialog>
    );
}
