import type { FormEventHandler, KeyboardEventHandler, ReactNode, Ref } from "react";

type FormSurfaceProps = {
    children: ReactNode;
    className?: string;
    formRef?: Ref<HTMLFormElement>;
    onKeyDown?: KeyboardEventHandler<HTMLFormElement>;
    onSubmit: FormEventHandler<HTMLFormElement>;
};

/** Provides the consistent bordered form surface used by feature add and edit forms. */
export function FormSurface({
    children,
    className,
    formRef,
    onKeyDown,
    onSubmit,
}: FormSurfaceProps) {
    return (
        <form
            ref={formRef}
            className={`form-surface${className ? ` ${className}` : ""}`}
            onKeyDown={onKeyDown}
            onSubmit={onSubmit}
        >
            {children}
        </form>
    );
}

/** Keeps related form fields aligned horizontally until the narrow-screen layout stacks them. */
export function FieldRow({ children }: { children: ReactNode }) {
    return <div className="form-row">{children}</div>;
}

/** Renders a consistent form-field label, including the required marker when needed. */
export function FieldLabel({
    children,
    required = false,
}: {
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <span className={`field-label${required ? " field-label-required" : ""}`}>
            {children}
        </span>
    );
}

/** Aligns form cancellation and submission controls consistently. */
export function FormActions({ children }: { children: ReactNode }) {
    return <div className="form-actions">{children}</div>;
}
