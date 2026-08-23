import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { Header } from "./components/Header";
import { TripDashboard } from "./pages/Dashboard";
import { TripBudgetPage } from "./pages/BudgetPage";
import { TripItineraryPage } from "./pages/ItineraryPage";
import { TripPackingPage } from "./pages/PackingPage";
import { TripSetupPage } from "./pages/SetupPage";
import { TripWorkspace } from "./pages/Workspace";
import { AuthLoading, AuthPage } from "./pages/AuthPages";
import "./App.css";

/** Defines the shared application shell and the page hierarchy for every browser URL. */
function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route element={<ProtectedApp />}>
                    <Route path="/" element={<TripDashboard />} />
                    {/* TripWorkspace loads the selected trip and renders the nested feature page via Outlet. */}
                    <Route path="/trips/:id" element={<TripWorkspace />}>
                        <Route index element={<TripItineraryPage />} />
                        <Route path="budget" element={<TripBudgetPage />} />
                        <Route path="packing" element={<TripPackingPage />} />
                        <Route path="details" element={<TripSetupPage />} />
                    </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    );
}

function ProtectedApp() {
    const { user, isLoading } = useAuth();
    if (isLoading) return <AuthLoading />;
    if (!user) return <Navigate to="/login" replace />;

    return <main className="app-shell"><Header /><Outlet /></main>;
}

export default App;
