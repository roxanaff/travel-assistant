import { Link } from "react-router-dom";

import "./Header.css";

/** Persistent application header; its brand link is the global route back to the dashboard. */
export function Header() {
    return (
        <header className="topbar">
            <Link className="brand" to="/" aria-label="Travel Assistant home">
                <span className="brand-mark">T</span>
                <span>Travel Assistant</span>
            </Link>
        </header>
    );
}
