import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import IntegrationGuidePage from "@/pages/IntegrationGuidePage";
import DashboardPage from "@/pages/DashboardPage";
import TenantsPage from "@/pages/TenantsPage";
import TenantDetailPage from "@/pages/TenantDetailPage";
import ConversationsPage from "@/pages/ConversationsPage";
import OrdersPage from "@/pages/OrdersPage";
import VoiceTestPage from "@/pages/VoiceTestPage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Public: a developer with no account must be able to read the spec. */}
        <Route path="/guide/:token" element={<IntegrationGuidePage />} />

        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/voice-test" element={<VoiceTestPage />} />
          <Route path="/integration-guide" element={<IntegrationGuidePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
