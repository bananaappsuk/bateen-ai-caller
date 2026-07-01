import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ContactPage from "./pages/ContactPage.tsx";
import FAQPage from "./pages/FAQPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import SignupPage from "./pages/SignupPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import AIAgentsPage from "./pages/AIAgentsPage.tsx";
import CreateAgentPage from "./pages/CreateAgentPage.tsx";
import CampaignsPage from "./pages/CampaignsPage.tsx";
import CreateCampaignPage from "./pages/CreateCampaignPage.tsx";
import LeadsPage from "./pages/LeadsPage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import AcademyPage from "./pages/AcademyPage.tsx";
import SupportPage from "./pages/SupportPage.tsx";
import ChoosePlanPage from "./pages/ChoosePlanPage.tsx";
import NotFound from "./pages/NotFound.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/ai-agents" element={<AIAgentsPage />} />
          <Route path="/ai-agents/create" element={<CreateAgentPage />} />
          <Route path="/dashboard/agents" element={<AIAgentsPage />} />
          <Route path="/dashboard/agents/create" element={<CreateAgentPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/campaigns/create" element={<CreateCampaignPage />} />
          <Route path="/dashboard/campaigns" element={<CampaignsPage />} />
          <Route path="/dashboard/campaigns/create" element={<CreateCampaignPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/dashboard/leads" element={<LeadsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
          <Route path="/academy" element={<AcademyPage />} />
          <Route path="/dashboard/academy" element={<AcademyPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/dashboard/support" element={<SupportPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
