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
import CampaignsPage from "./pages/CampaignsPage.tsx";
import LeadsPage from "./pages/LeadsPage.tsx";
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
          <Route path="/dashboard/agents" element={<AIAgentsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/dashboard/campaigns" element={<CampaignsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/dashboard/leads" element={<LeadsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
