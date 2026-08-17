import { Link } from "react-router-dom";

import "./Header.css";

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
