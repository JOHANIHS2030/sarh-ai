import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RequestProvider } from "@/contexts/RequestContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { ExternalUsersProvider } from "@/contexts/ExternalUsersContext";
import { VehicleStickerProvider } from "@/contexts/VehicleStickerContext";
import { PermitsProvider } from "@/contexts/PermitsContext";
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
import ExternalVehicleStickerPage from "@/pages/ExternalVehicleStickerPage";
import ExternalUsersSettingsPage from "@/pages/ExternalUsersSettingsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import WorkflowPage from "@/pages/WorkflowPage";
import FormBuilderPage from "@/pages/FormBuilderPage";
import NewVehicleStickerPage from "@/pages/stickers/NewVehicleStickerPage";
import MyStickersPage from "@/pages/stickers/MyStickersPage";
import StickerPendingApprovalsPage from "@/pages/stickers/StickerPendingApprovalsPage";
import AllStickersPage from "@/pages/stickers/AllStickersPage";
import VehicleStickerDetailsPage from "@/pages/stickers/VehicleStickerDetailsPage";
import NewPermitPage from "@/pages/permits/NewPermitPage";
import MyPermitsPage from "@/pages/permits/MyPermitsPage";
import PermitPendingApprovalsPage from "@/pages/permits/PermitPendingApprovalsPage";
import AllPermitsPage from "@/pages/permits/AllPermitsPage";
import PermitDetailsPage from "@/pages/permits/PermitDetailsPage";
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

        {/* Vehicle Stickers */}
        <Route path="/stickers/new" element={<NewVehicleStickerPage />} />
        <Route path="/stickers/my" element={<MyStickersPage />} />
        <Route path="/stickers/pending" element={<StickerPendingApprovalsPage />} />
        <Route path="/stickers/all" element={<AllStickersPage />} />
        <Route path="/stickers/request/:id" element={<VehicleStickerDetailsPage />} />

        {/* Permits */}
        <Route path="/permits/new" element={<NewPermitPage />} />
        <Route path="/permits/my" element={<MyPermitsPage />} />
        <Route path="/permits/pending" element={<PermitPendingApprovalsPage />} />
        <Route path="/permits/all" element={<AllPermitsPage />} />
        <Route path="/permits/request/:id" element={<PermitDetailsPage />} />

        <Route path="/settings/users" element={<UsersSettingsPage />} />
        <Route path="/settings/external-users" element={<ExternalUsersSettingsPage />} />
        <Route path="/settings/departments" element={<DepartmentsSettingsPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/settings/company" element={<CompanySettingsPage />} />
        <Route path="/builder" element={<FormBuilderPage />} />
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
            <ExternalUsersProvider>
              <RequestProvider>
                <VehicleStickerProvider>
                  <BrowserRouter>
                    <Routes>
                      <Route path="/external-form" element={<ExternalFormPage />} />
                      <Route path="/external-vehicle-sticker" element={<ExternalVehicleStickerPage />} />
                      <Route path="/*" element={<AuthenticatedApp />} />
                    </Routes>
                  </BrowserRouter>
                </VehicleStickerProvider>
              </RequestProvider>
            </ExternalUsersProvider>
          </CompanyProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
