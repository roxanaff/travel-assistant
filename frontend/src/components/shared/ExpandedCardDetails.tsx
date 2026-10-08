// Reusable area beneath an expanded card for extra information supplied
// by the feature; it does not decide when the card opens.
import type { ReactNode } from "react";

type Props = {
    children: ReactNode;
    className?: string;
    id?: string;
};

/** Provides the shared secondary-information surface beneath an expanded card. */
export function ExpandedCardDetails({ children, className, id }: Props) {
    return (
        <div id={id} className={`expanded-card-details${className ? ` ${className}` : ""}`}>
            {children}
        </div>
    );
}

