import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./components/ui/theme-provider";
import { SidebarProvider } from "./contexts/sidebar-context";
import { RealtimeProvider } from "./components/realtime-provider";
import { WebSocketStatus } from "./components/websocket-status";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Metrics from "@/pages/metrics";
import Finalizados from "@/pages/finalizados";
import NovoProjeto from "@/pages/novo-projeto";
import MinhaFila from "@/pages/minha-fila";
import Relatorios from "@/pages/relatorios";
import DatabasePage from "@/pages/database";
import NotasPage from "@/pages/notas";
import TimelapsePage from "@/pages/timelapse";
import ClientePortal from "@/pages/cliente-portal";
import PortalUnificado from "@/pages/portal-unificado";
import TestePortal from "@/pages/teste-portal";

function Router() {
  return (
    <Switch>
      {/* Rotas públicas do cliente - sem autenticação */}
      <Route path="/teste/:token" component={TestePortal} />
      <Route path="/portal/cliente/:clientToken" component={PortalUnificado} />
      <Route path="/cliente/:token" component={ClientePortal} />

      {/* Rotas protegidas */}
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/metricas" component={Metrics} />
      <ProtectedRoute path="/finalizados" component={Finalizados} />
      <ProtectedRoute path="/novo-projeto" component={NovoProjeto} />
      <ProtectedRoute path="/minha-fila" component={MinhaFila} />
      <ProtectedRoute path="/relatorios" component={Relatorios} />
      <ProtectedRoute path="/banco-de-dados" component={DatabasePage} />
      <ProtectedRoute path="/notas" component={NotasPage} />
      <ProtectedRoute path="/timelapse" component={TimelapsePage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Expor queryClient globalmente para invalidação instantânea
  if (typeof window !== 'undefined') {
    (window as any).queryClient = queryClient;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="videoflow-theme">
        <AuthProvider>
          <RealtimeProvider>
            <SidebarProvider>
              <TooltipProvider>
                <Toaster />
                <WebSocketStatus />
                <Router />
              </TooltipProvider>
            </SidebarProvider>
          </RealtimeProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
