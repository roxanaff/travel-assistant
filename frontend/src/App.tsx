import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { TripDashboard } from "./pages/TripDashboard";
import { TripBudgetPage } from "./pages/TripBudgetPage";
import { TripItineraryPage } from "./pages/TripItineraryPage";
import { TripPackingPage } from "./pages/TripPackingPage";
import { TripSetupPage } from "./pages/TripSetupPage";
import { TripWorkspace } from "./pages/TripWorkspace";
import "./App.css";

/** Defines the shared application shell and the page hierarchy for every browser URL. */
function App() {
  return (
    <main className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<TripDashboard />} />
        {/* TripWorkspace loads the selected trip and renders the nested feature page via Outlet. */}
        <Route path="/trips/:id" element={<TripWorkspace />}>
          <Route index element={<TripItineraryPage />} />
          <Route path="budget" element={<TripBudgetPage />} />
          <Route path="packing" element={<TripPackingPage />} />
          <Route path="details" element={<TripSetupPage />} />
        </Route>
      </Routes>
    </main>
  );
}

export default App;
