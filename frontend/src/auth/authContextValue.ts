// Describes the account information and actions shared across the frontend.
// This defines a React context, not a database model; AuthProvider supplies its values.
import { createContext } from "react";
import type { CurrentUser } from "../api/authApi";

export type AuthContextValue = {
    user: CurrentUser | null;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (
        displayName: string,
        email: string,
        password: string,
    ) => Promise<void>;
    logout: () => Promise<void>;
    changePassword: (
        currentPassword: string,
        newPassword: string,
    ) => Promise<void>;
    deleteAccount: (password: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
