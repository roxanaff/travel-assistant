import { Route, Routes } from "react-router-dom"
import { Header } from "./components/Header"
import { TripDashboard } from "./pages/TripDashboard"
import { TripDetails } from "./pages/TripDetails"
import "./App.css"

function App() {
  return (
    <main className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<TripDashboard />} />
        <Route path="/trips/:id" element={<TripDetails />} />
      </Routes>
    </main>
  )
}

export default App
