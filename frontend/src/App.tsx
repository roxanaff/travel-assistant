import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { TripDashboard } from "./pages/TripDashboard";
import { TripBudgetPage } from "./pages/TripBudgetPage";
import { TripItineraryPage } from "./pages/TripItineraryPage";
import { TripPackingPage } from "./pages/TripPackingPage";
import { TripSetupPage } from "./pages/TripSetupPage";
import { TripWorkspace } from "./pages/TripWorkspace";
import "./App.css";

function App() {
  return (
    <main className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<TripDashboard />} />
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
