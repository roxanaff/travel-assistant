import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useDismissibleMenu } from "../utils/useDismissibleMenu";

import "./Header.css";

/** Persistent application header; its brand link is the global route back to the dashboard. */
export function Header() {
    const { user, logout, changePassword, deleteAccount } = useAuth();
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [dialog, setDialog] = useState<"change-password" | "delete-account" | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useDismissibleMenu(isMenuOpen, menuRef, () => setIsMenuOpen(false));

    const signOut = async () => {
        await logout();
        navigate("/login");
    };

    const openDialog = (nextDialog: "change-password" | "delete-account") => {
        setIsMenuOpen(false);
        setDialog(nextDialog);
    };

    useEffect(() => {
        if (!dialog) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setDialog(null);
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [dialog]);

    return (
        <header className="topbar">
            <Link className="brand" to="/" aria-label="Travel Assistant home">
                <span className="brand-mark">T</span>
                <span>Travel Assistant</span>
            </Link>
            <div className="account-menu" ref={menuRef}>
                <button className="account-trigger" type="button" onClick={() => setIsMenuOpen((current) => !current)} aria-expanded={isMenuOpen} aria-haspopup="menu">
                    <span className="account-initial" aria-hidden="true">{user?.displayName.charAt(0).toUpperCase()}</span>
                    <span>{user?.displayName}</span>
                </button>
                {isMenuOpen && (
                    <div className="account-dropdown" role="menu">
                        <strong>{user?.displayName}</strong>
                        <span>{user?.email}</span>
                        <button className="text-button" type="button" onClick={() => openDialog("change-password")} role="menuitem">Change password</button>
                        <button className="text-button" type="button" onClick={() => void signOut()} role="menuitem">Sign out</button>
                        <button className="text-button account-delete-button" type="button" onClick={() => openDialog("delete-account")} role="menuitem">Delete account</button>
                    </div>
                )}
            </div>
            {dialog === "change-password" && (
                <ChangePasswordDialog
                    onClose={() => setDialog(null)}
                    onSubmit={changePassword}
                />
            )}
            {dialog === "delete-account" && (
                <DeleteAccountDialog
                    onClose={() => setDialog(null)}
                    onSubmit={async (password) => {
                        await deleteAccount(password);
                        navigate("/login");
                    }}
                />
            )}
        </header>
    );
}

type DialogProps = {
    onClose: () => void;
};

function ChangePasswordDialog({ onClose, onSubmit }: DialogProps & { onSubmit: (currentPassword: string, newPassword: string) => Promise<void> }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        if (newPassword.length < 8) {
            setError("Your new password must be at least 8 characters.");
            return;
        }
        if (newPassword !== confirmation) {
            setError("Your new passwords do not match.");
            return;
        }

        setIsSaving(true);
        try {
            await onSubmit(currentPassword, newPassword);
            onClose();
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not change your password. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AccountDialog title="Change password" onClose={onClose}>
            <form className="account-form" onSubmit={submit}>
                <label>Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></label>
                <label>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
                <label>Confirm new password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required /></label>
                {error && <p className="form-error">{error}</p>}
                <div className="account-dialog-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Change password"}</button></div>
            </form>
        </AccountDialog>
    );
}

function DeleteAccountDialog({ onClose, onSubmit }: DialogProps & { onSubmit: (password: string) => Promise<void> }) {
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsDeleting(true);
        try {
            await onSubmit(password);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Could not delete your account. Please try again.");
            setIsDeleting(false);
        }
    };

    return (
        <AccountDialog title="Delete account" onClose={onClose}>
            <form className="account-form" onSubmit={submit}>
                <p>This permanently deletes your account, trips, and all trip data. Enter your password to continue.</p>
                <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
                {error && <p className="form-error">{error}</p>}
                <div className="account-dialog-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="danger-button" type="submit" disabled={isDeleting}>{isDeleting ? "Deleting…" : "Delete account"}</button></div>
            </form>
        </AccountDialog>
    );
}

function AccountDialog({ title, onClose, children }: DialogProps & { title: string; children: React.ReactNode }) {
    return (
        <div className="account-dialog-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title">
                <div className="account-dialog-title-row"><h2 id="account-dialog-title">{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button></div>
                {children}
            </section>
        </div>
    );
}
