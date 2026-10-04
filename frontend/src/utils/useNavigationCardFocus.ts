import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const createCardFocusState = (cardId: string) => ({
    cardFocus: { cardId },
});

type CardFocusState = {
    cardFocus?: {
        cardId?: string;
    };
};

type Options = {
    availableIds: string[];
    elementIdPrefix: string;
    expand: (id: string) => void;
};

/** Consumes a one-use navigation request and briefly highlights its destination card. */
export function useNavigationCardFocus({
    availableIds,
    elementIdPrefix,
    expand,
}: Options) {
    const location = useLocation();
    const navigate = useNavigate();
    const pendingFocusIdRef = useRef<string | null>(null);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        const state = location.state as CardFocusState | null;
        const requestedId = state?.cardFocus?.cardId;
        if (!requestedId) return;

        pendingFocusIdRef.current = requestedId;
        const remainingState = { ...state };
        delete remainingState.cardFocus;

        navigate(
            {
                pathname: location.pathname,
                search: location.search,
                hash: location.hash,
            },
            {
                replace: true,
                state: Object.keys(remainingState).length > 0 ? remainingState : null,
            },
        );
    }, [location.hash, location.key, location.pathname, location.search, location.state, navigate]);

    useEffect(() => {
        const focusId = pendingFocusIdRef.current;
        if (!focusId || !availableIds.includes(focusId)) return;

        pendingFocusIdRef.current = null;
        expand(focusId);
        setHighlightedId(focusId);
        document.getElementById(`${elementIdPrefix}-${focusId}`)?.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    }, [availableIds, elementIdPrefix, expand]);

    useEffect(() => {
        if (!highlightedId) return;

        const timer = window.setTimeout(() => setHighlightedId(null), 2200);
        return () => window.clearTimeout(timer);
    }, [highlightedId]);

    return highlightedId;
}
