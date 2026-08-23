import { useEffect, useMemo, useState } from "react";
import * as authApi from "../api/authApi";
import type { CurrentUser } from "../api/authApi";
import { AuthContext } from "./authContextValue";
import type { AuthContextValue } from "./authContextValue";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        void authApi.getCurrentUser()
            .then((currentUser) => {
                if (isMounted) setUser(currentUser);
            })
            .catch(() => {
                if (isMounted) setError("Could not connect to your account. Please try again.");
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const value = useMemo<AuthContextValue>(() => ({
        user,
        isLoading,
        error,
        async login(email, password) {
            const currentUser = await authApi.login({ email, password });
            setUser(currentUser);
            setError(null);
        },
        async register(displayName, email, password) {
            const currentUser = await authApi.register({ displayName, email, password });
            setUser(currentUser);
            setError(null);
        },
        async logout() {
            await authApi.logout();
            setUser(null);
        },
        async changePassword(currentPassword, newPassword) {
            await authApi.changePassword(currentPassword, newPassword);
        },
        async deleteAccount(password) {
            await authApi.deleteAccount(password);
            setUser(null);
        },
    }), [error, isLoading, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
