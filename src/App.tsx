import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthDialog } from "./components/AuthDialog";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import { User } from "lucide-react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, login } = useAuth();

  return (
    <BrowserRouter>
      {!isAuthenticated ? (
        <AuthDialog onAuthSuccess={login} />
      ) : (
        // Remove the floating user icon/avatar here
      <Routes>
        <Route path="/" element={<Index />} />
          <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      )}
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
