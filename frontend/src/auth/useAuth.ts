// Gives a component access to the shared sign-in state and account actions.
// It must be called from inside AuthProvider, which App places around the routes.
import { useContext } from "react";
import { AuthContext } from "./authContextValue";

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error("useAuth must be used inside AuthProvider.");
    return value;
}
