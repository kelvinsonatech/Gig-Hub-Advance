import { Suspense, lazy, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { LoginConfetti } from "@/components/LoginConfetti";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { useFcm } from "@/hooks/use-fcm";
import { useImagePreloader } from "@/hooks/use-image-preloader";

// Lazy-loaded pages — each page becomes its own JS chunk
const Login            = lazy(() => import("@/pages/Login"));
const Register         = lazy(() => import("@/pages/Register"));
const Dashboard        = lazy(() => import("@/pages/Dashboard"));
const Bundles          = lazy(() => import("@/pages/Bundles"));
const Services         = lazy(() => import("@/pages/Services"));
const Wallet           = lazy(() => import("@/pages/Wallet"));
const Orders           = lazy(() => import("@/pages/Orders"));
const AFARegistration  = lazy(() => import("@/pages/AFARegistration"));
const PaymentSuccess   = lazy(() => import("@/pages/PaymentSuccess"));
const NotFound         = lazy(() => import("@/pages/not-found"));

// Admin pages
const AdminDashboard      = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminNetworks       = lazy(() => import("@/pages/admin/AdminNetworks"));
const AdminBundles        = lazy(() => import("@/pages/admin/AdminBundles"));
const AdminServices       = lazy(() => import("@/pages/admin/AdminServices"));
const AdminNotifications  = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminOrders         = lazy(() => import("@/pages/admin/AdminOrders"));
const AdminUsers          = lazy(() => import("@/pages/admin/AdminUsers"));

// Intercept fetch to automatically add Authorization Bearer token
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const token = localStorage.getItem("gigshub_token");
  if (token) {
    init = init || {};
    const headers = new Headers(init.headers as HeadersInit | undefined);
    headers.set("Authorization", `Bearer ${token}`);
    init = { ...init, headers };
  }
  return originalFetch(input, init);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Keep previous data while fetching so pages never flash blank
      placeholderData: keepPreviousData,
    },
  },
});

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);
  return null;
}

// Minimal blank placeholder while a lazy page chunk loads
function PageShell() {
  return <div className="min-h-[60vh]" />;
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
        <Suspense fallback={<PageShell />}>
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
        </Suspense>
      </AdminLayout>
    );
  }

  return (
    <PublicLayout>
      <ScrollToTop />
      <AnimatePresence initial={false}>
        <motion.div
          key={location}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
        >
          <Suspense fallback={<PageShell />}>
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
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </PublicLayout>
  );
}

function FcmInit() {
  useFcm();
  return null;
}

function PaymentGuard() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
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
