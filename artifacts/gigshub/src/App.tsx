import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { API } from "@/lib/api";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LoginConfetti } from "@/components/LoginConfetti";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { useFcm } from "@/hooks/use-fcm";
import { useImagePreloader } from "@/hooks/use-image-preloader";

// Pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Bundles from "@/pages/Bundles";
import Services from "@/pages/Services";
import Wallet from "@/pages/Wallet";
import Orders from "@/pages/Orders";
import AFARegistration from "@/pages/AFARegistration";
import PaymentSuccess from "@/pages/PaymentSuccess";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminNetworks from "@/pages/admin/AdminNetworks";
import AdminBundles from "@/pages/admin/AdminBundles";
import AdminServices from "@/pages/admin/AdminServices";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminUsers from "@/pages/admin/AdminUsers";

// ── Secure fetch interceptor ─────────────────────────────────────────────────
// Only attaches the auth token to requests going to our own API server.
// Third-party URLs (Paystack, FCM, etc.) never receive the token.
const originalFetch = window.fetch;
const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function isOwnApiRequest(input: RequestInfo | URL): boolean {
  const url =
    typeof input === "string" ? input
    : input instanceof URL ? input.href
    : (input as Request).url;
  if (url.startsWith("/api/") || url.startsWith("/api?")) return true;
  if (API_BASE && url.startsWith(API_BASE)) return true;
  try {
    return new URL(url).hostname === window.location.hostname;
  } catch {
    return false;
  }
}

window.fetch = async (input, init) => {
  const token = localStorage.getItem("gigshub_token");
  if (token && isOwnApiRequest(input)) {
    init = init ?? {};
    const headers = new Headers(init.headers as HeadersInit | undefined);
    headers.set("Authorization", `Bearer ${token}`);
    init = { ...init, headers };
  }
  const response = await originalFetch(input, init);
  // Notify the app when a token is rejected so it can log the user out
  if (response.status === 401 && isOwnApiRequest(input)) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }
  return response;
};
// ─────────────────────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

// Listens for 401 responses from the API and auto-logs the user out
function GlobalAuthGuard() {
  const { logout } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = () => {
      logout();
      navigate("/login");
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [logout, navigate]);

  return null;
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);
  return null;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  if (isAdmin) {
    return (
      <AdminLayout>
        <ScrollToTop />
        <Switch location={location}>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/networks" component={AdminNetworks} />
          <Route path="/admin/bundles" component={AdminBundles} />
          <Route path="/admin/services" component={AdminServices} />
          <Route path="/admin/notifications" component={AdminNotifications} />
          <Route path="/admin/orders" component={AdminOrders} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    );
  }

  return (
    <PublicLayout>
      <ScrollToTop />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Switch location={location}>
            <Route path="/"><Redirect to="/login" /></Route>
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/bundles" component={Bundles} />
            <Route path="/services" component={Services} />
            <Route path="/wallet" component={Wallet} />
            <Route path="/orders" component={Orders} />
            <Route path="/afa-registration" component={AFARegistration} />
            <Route path="/payment-success" component={PaymentSuccess} />
            <Route component={NotFound} />
          </Switch>
        </motion.div>
      </AnimatePresence>
    </PublicLayout>
  );
}

function FcmInit() {
  useFcm();
  return null;
}

// Detects when the user presses the browser back button from Paystack's page
// and navigates them to the payment-success page with a cancelled status.
function PaymentGuard() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      // persisted=true means page was restored from bfcache (back/forward navigation)
      if (!e.persisted) return;
      const intent = localStorage.getItem("turbogh_payment_intent");
      if (intent) {
        localStorage.removeItem("turbogh_payment_intent");
        navigate("/payment-success?status=cancelled");
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [navigate]);

  return null;
}

function ImagePreloader() {
  useImagePreloader();
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <GlobalAuthGuard />
          <Router />
          <LoginConfetti />
          <InstallPrompt />
          <FcmInit />
          <ImagePreloader />
          <PaymentGuard />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
