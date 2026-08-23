import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import "./AuthPages.css";

type AuthPageProps = { mode: "login" | "register" };

export function AuthPage({ mode }: AuthPageProps) {
    const { user, isLoading, error: sessionError, login, register } = useAuth();
    const navigate = useNavigate();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isRegister = mode === "register";

    if (isLoading) return <AuthLoading />;
    if (user) return <Navigate to="/" replace />;

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (isRegister && !displayName.trim()) {
            setError("Enter your name.");
            return;
        }
        if (password.length < 8) {
            setError("Your password must be at least 8 characters.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (isRegister) await register(displayName.trim(), email.trim(), password);
            else await login(email.trim(), password);
            navigate("/");
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="auth-shell">
            <section className="auth-card" aria-labelledby="auth-title">
                <Link className="brand auth-brand" to="/" aria-label="Travel Assistant home">
                    <span className="brand-mark">T</span>
                    <span>Travel Assistant</span>
                </Link>
                <h1 id="auth-title">{isRegister ? "Create your account" : "Welcome back"}</h1>
                <p className="auth-intro">
                    {isRegister ? "Start planning trips in your own private workspace." : "Sign in to continue planning your trips."}
                </p>
                {sessionError && <p className="form-error">{sessionError}</p>}
                <form className="auth-form" onSubmit={submit}>
                    {isRegister && (
                        <label>
                            <span className="field-label">Name <span aria-hidden="true">*</span></span>
                            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={100} required />
                        </label>
                    )}
                    <label>
                        <span className="field-label">Email <span aria-hidden="true">*</span></span>
                        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
                    </label>
                    <label>
                        <span className="field-label">Password <span aria-hidden="true">*</span></span>
                        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} minLength={8} required />
                        {isRegister && <small>At least 8 characters.</small>}
                    </label>
                    {error && <p className="form-error">{error}</p>}
                    <button className="primary-button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Please wait…" : (isRegister ? "Create account" : "Sign in")}
                    </button>
                </form>
                <p className="auth-switch">
                    {isRegister ? "Already have an account?" : "New here?"}
                    <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link>
                </p>
            </section>
        </main>
    );
}

export function AuthLoading() {
    return <main className="auth-shell"><p className="auth-loading">Checking your session…</p></main>;
}
