import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import CreateInvoice from "@/pages/create-invoice";
import Clients from "@/pages/clients";
import Settings from "@/pages/settings";
import Sidebar from "@/components/layout/sidebar";
import NotFound from "@/pages/not-found";
import InvoiceDetails from "@/pages/invoice-details";
import EditInvoice from "@/pages/edit-invoice";

function ProtectedRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { firebaseUser, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!firebaseUser || !user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Component />
      </div>
    </div>
  );
}

function PublicRoute({
  component: Component,
}: {
  component: React.ComponentType;
}) {
  const { firebaseUser, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (firebaseUser && user) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route
        path="/"
        component={() => <PublicRoute component={LandingPage} />}
      />
      <Route
        path="/auth"
        component={() => <PublicRoute component={AuthPage} />}
      />
      <Route
        path="/login"
        component={() => <PublicRoute component={AuthPage} />}
      />
      <Route
        path="/register"
        component={() => <PublicRoute component={AuthPage} />}
      />
      <Route
        path="/dashboard"
        component={() => <ProtectedRoute component={Dashboard} />}
      />
      <Route
        path="/invoices"
        component={() => <ProtectedRoute component={Invoices} />}
      />
      <Route
        path="/invoices/create"
        component={() => <ProtectedRoute component={CreateInvoice} />}
      />
      <Route
        path="/invoices/:invoiceId"
        component={() => <ProtectedRoute component={InvoiceDetails} />}
      />

      <Route
        path="/invoices/:invoiceId/edit"
        component={() => <ProtectedRoute component={EditInvoice} />}
      />

      <Route
        path="/clients"
        component={() => <ProtectedRoute component={Clients} />}
      />
      <Route
        path="/settings"
        component={() => <ProtectedRoute component={Settings} />}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
