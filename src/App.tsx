import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RequestProvider } from "@/contexts/RequestContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import CompanySettingsPage from "@/pages/CompanySettingsPage";
import LoginPage from "@/pages/LoginPage";
import AppLayout from "@/components/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import NewRequestPage from "@/pages/NewRequestPage";
import MyRequestsPage from "@/pages/MyRequestsPage";
import PendingApprovalsPage from "@/pages/PendingApprovalsPage";
import AllRequestsPage from "@/pages/AllRequestsPage";
import RequestDetailsPage from "@/pages/RequestDetailsPage";
import UsersSettingsPage from "@/pages/UsersSettingsPage";
import DepartmentsSettingsPage from "@/pages/DepartmentsSettingsPage";
import ExternalFormPage from "@/pages/ExternalFormPage";
import AuditLogPage from "@/pages/AuditLogPage";
import WorkflowPage from "@/pages/WorkflowPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const { currentUser } = useAuth();

  if (!currentUser) return <LoginPage />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/new-request" element={<NewRequestPage />} />
        <Route path="/my-requests" element={<MyRequestsPage />} />
        <Route path="/pending-approvals" element={<PendingApprovalsPage />} />
        <Route path="/all-requests" element={<AllRequestsPage />} />
        <Route path="/request/:id" element={<RequestDetailsPage />} />
        <Route path="/settings/users" element={<UsersSettingsPage />} />
        <Route path="/settings/departments" element={<DepartmentsSettingsPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/settings/company" element={<CompanySettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <LanguageProvider>
        <AuthProvider>
          <CompanyProvider>
            <RequestProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/external-form" element={<ExternalFormPage />} />
                  <Route path="/*" element={<AuthenticatedApp />} />
                </Routes>
              </BrowserRouter>
            </RequestProvider>
          </CompanyProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
