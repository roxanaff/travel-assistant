import { useEffect, type RefObject } from "react";

/** Closes an open popup menu when its user clicks elsewhere or presses Escape. */
export function useDismissibleMenu(
    isOpen: boolean,
    menuRef: RefObject<HTMLElement | null>,
    onClose: () => void,
) {
    useEffect(() => {
        if (!isOpen) return;

        const closeWhenClickedElsewhere = (event: PointerEvent) => {
            if (
                event.target instanceof Node &&
                !menuRef.current?.contains(event.target)
            ) {
                onClose();
            }
        };

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;

            event.preventDefault();
            onClose();
            window.requestAnimationFrame(() =>
                menuRef.current
                    ?.querySelector<HTMLElement>("[data-menu-trigger]")
                    ?.focus(),
            );
        };

        document.addEventListener("pointerdown", closeWhenClickedElsewhere);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener(
                "pointerdown",
                closeWhenClickedElsewhere,
            );
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isOpen, menuRef, onClose]);
}
