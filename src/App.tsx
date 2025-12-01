import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import OnboardingOverlay from "@/components/onboarding/OnboardingOverlay";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Chats from "./pages/Chats";
import Contacts from "./pages/Contacts";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import OrdersNew from "./pages/OrdersNew";
import WhatsApp from "./pages/WhatsApp";
import AIAgent from "./pages/AIAgent";
import Store from "./pages/Store";
import Settings from "./pages/Settings";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import PublicStore from "./pages/PublicStore";
import PublicStoreCart from "./pages/PublicStoreCart";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import OrderManagement from "./pages/OrderManagement";
import Integrations from "./pages/Integrations";
import Landing from "./pages/Landing";
import Landing2 from "./pages/Landing2";
import Presentation from "./pages/Presentation";
import Admin from "./pages/Admin";
import VectorSearchTest from "./pages/VectorSearchTest";
import FeaturedProducts from "./pages/FeaturedProducts";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Templates from "./pages/Templates";
import Onboarding from "./pages/Onboarding";
import OnboardingReview from "./pages/admin/OnboardingReview";
import DemoLanding from "./pages/DemoLanding";
import Automations from "./pages/Automations";

const queryClient = new QueryClient();

import { ThemeProvider } from "@/components/theme-provider";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <BrowserRouter>
        <AuthProvider>
          <OnboardingProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/landing2" element={<Landing2 />} />
                <Route path="/presentation" element={<Presentation />} />
                <Route path="/demo" element={<DemoLanding />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                {/* <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} /> */}
                <Route path="/whatsapp" element={<ProtectedRoute><WhatsApp /></ProtectedRoute>} />
                <Route path="/ai-agent" element={<ProtectedRoute><AIAgent /></ProtectedRoute>} />
                <Route path="/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
                <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />
                <Route path="/store-config" element={<ProtectedRoute><Store /></ProtectedRoute>} />
                <Route path="/store/:slug" element={<PublicStore />} />
                <Route path="/store/:slug/product/:productId" element={<ProductDetail />} />
                <Route path="/store/:slug/cart" element={<PublicStoreCart />} />
                <Route path="/tienda/:slug" element={<PublicStoreCart />} />
                <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
                <Route path="/order-management" element={<ProtectedRoute><OrdersNew /></ProtectedRoute>} />
                <Route path="/featured-products" element={<ProtectedRoute><FeaturedProducts /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>} />
                <Route path="/admin/onboarding" element={<ProtectedRoute><AdminRoute><OnboardingReview /></AdminRoute></ProtectedRoute>} />
                <Route path="/vector-test" element={<ProtectedRoute><VectorSearchTest /></ProtectedRoute>} />
                <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <OnboardingOverlay />
            </TooltipProvider>
          </OnboardingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
