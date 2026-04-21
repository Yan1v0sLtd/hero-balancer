import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EnvironmentProvider } from './contexts/EnvironmentContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Heroes from './pages/Heroes';
import HeroEditor from './pages/HeroEditor';
import Cards from './pages/Cards';
import CardEditor from './pages/CardEditor';
import Abilities from './pages/Abilities';
import AbilityEditor from './pages/AbilityEditor';
import PowerLedger from './pages/PowerLedger';
import Coefficients from './pages/Coefficients';
import Budgets from './pages/Budgets';
import Factors from './pages/Factors';
import Archetypes from './pages/Archetypes';
import SynergyFlags from './pages/SynergyFlags';
import BalanceReport from './pages/BalanceReport';

export default function App() {
  return (
    <AuthProvider>
      <EnvironmentProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="heroes" element={<Heroes />} />
            <Route path="heroes/new" element={<HeroEditor />} />
            <Route path="heroes/:id" element={<HeroEditor />} />
            <Route path="cards" element={<Cards />} />
            <Route path="cards/new" element={<CardEditor />} />
            <Route path="cards/:id" element={<CardEditor />} />
            <Route path="abilities" element={<Abilities />} />
            <Route path="abilities/new" element={<AbilityEditor />} />
            <Route path="abilities/:id" element={<AbilityEditor />} />
            <Route path="ledger" element={<PowerLedger />} />
            <Route path="coefficients" element={<Coefficients />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="factors" element={<Factors />} />
            <Route path="archetypes" element={<Archetypes />} />
            <Route path="synergy" element={<SynergyFlags />} />
            <Route path="report" element={<BalanceReport />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </EnvironmentProvider>
    </AuthProvider>
  );
}
