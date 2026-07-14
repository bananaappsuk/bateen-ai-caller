import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ProtectedRoute, AdminRoute } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import FAQPage from "./pages/FAQPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import OnboardingPage from "./pages/OnboardingPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import AIAgentsPage from "./pages/AIAgentsPage.tsx";
import CreateAgentPage from "./pages/CreateAgentPage.tsx";
import CampaignsPage from "./pages/CampaignsPage.tsx";
import CreateCampaignPage from "./pages/CreateCampaignPage.tsx";
import CampaignDetailPage from "./pages/CampaignDetailPage.tsx";
import LeadsPage from "./pages/LeadsPage.tsx";
import LeadDetailPage from "./pages/LeadDetailPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import AcademyPage from "./pages/AcademyPage.tsx";
import SupportPage from "./pages/SupportPage.tsx";
import ChoosePlanPage from "./pages/ChoosePlanPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import TenantAdminPage from "./pages/TenantAdminPage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Wrap a protected page element.
const P = (el: JSX.Element) => <ProtectedRoute>{el}</ProtectedRoute>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/finish-registration" element={<Navigate to="/onboarding" replace />} />

            {/* Protected */}
            <Route path="/onboarding" element={P(<OnboardingPage />)} />
            <Route path="/dashboard" element={P(<DashboardPage />)} />
            <Route path="/ai-agents" element={P(<AIAgentsPage />)} />
            <Route path="/ai-agents/create" element={P(<CreateAgentPage />)} />
            <Route path="/dashboard/agents" element={P(<AIAgentsPage />)} />
            <Route path="/dashboard/agents/create" element={P(<CreateAgentPage />)} />
            <Route path="/campaigns" element={P(<CampaignsPage />)} />
            <Route path="/campaigns/create" element={P(<CreateCampaignPage />)} />
            <Route path="/campaigns/:id" element={P(<CampaignDetailPage />)} />
            <Route path="/dashboard/campaigns" element={P(<CampaignsPage />)} />
            <Route path="/dashboard/campaigns/create" element={P(<CreateCampaignPage />)} />
            <Route path="/dashboard/campaigns/:id" element={P(<CampaignDetailPage />)} />
            <Route path="/leads" element={P(<LeadsPage />)} />
            <Route path="/leads/:id" element={P(<LeadDetailPage />)} />
            <Route path="/dashboard/leads" element={P(<LeadsPage />)} />
            <Route path="/dashboard/leads/:id" element={P(<LeadDetailPage />)} />
            <Route path="/settings" element={P(<SettingsPage />)} />
            <Route path="/dashboard/settings" element={P(<SettingsPage />)} />
            <Route path="/academy" element={P(<AcademyPage />)} />
            <Route path="/dashboard/academy" element={P(<AcademyPage />)} />
            <Route path="/support" element={P(<SupportPage />)} />
            <Route path="/dashboard/support" element={P(<SupportPage />)} />
            <Route path="/plans" element={P(<ChoosePlanPage />)} />
            <Route path="/dashboard/plans" element={P(<ChoosePlanPage />)} />
            <Route path="/credits" element={P(<Navigate to="/dashboard/settings?tab=Billing" replace />)} />
            <Route path="/dashboard/credits" element={P(<Navigate to="/dashboard/settings?tab=Billing" replace />)} />

            {/* Admin */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/dashboard/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/dashboard/tenant-admin" element={<AdminRoute><TenantAdminPage /></AdminRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
