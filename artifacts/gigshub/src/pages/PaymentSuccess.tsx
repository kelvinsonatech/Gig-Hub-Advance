import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2, XOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/lib/api";
import confetti from "canvas-confetti";

const INTENT_KEY = "turbogh_payment_intent";

type WalletTopupIntent = {
  type: "wallet_topup";
  amount: number;
};

type BundlePurchaseIntent = {
  type: "bundle_purchase";
  bundleId: string;
  phoneNumber: string;
  bundlePrice: number;
};

type PaymentIntent = WalletTopupIntent | BundlePurchaseIntent;

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "cancelled" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    if (!reference) {
      navigate("/dashboard");
      return;
    }

    const rawIntent = localStorage.getItem(INTENT_KEY);
    const intent: PaymentIntent | null = rawIntent ? JSON.parse(rawIntent) : null;
    localStorage.removeItem(INTENT_KEY);

    const token = localStorage.getItem("gigshub_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const handleApiError = (err: any) => {
      if (err?.error === "payment_cancelled" || err?.message === "Payment was cancelled") {
        setStatus("cancelled");
      } else {
        setStatus("error");
        setMessage(err?.message || "Payment verification failed. Please contact support.");
      }
    };

    const verify = async () => {
      try {
        if (!intent || intent.type === "wallet_topup") {
          const res = await fetch(`${API}/api/wallet/topup/verify`, {
            method: "POST",
            headers,
            body: JSON.stringify({ reference }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { handleApiError(data); return; }
          setStatus("success");
          setMessage("Your wallet has been topped up successfully!");
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          setTimeout(() => navigate("/wallet"), 2500);
        } else {
          const res = await fetch(`${API}/api/orders`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              type: "bundle",
              bundleId: intent.bundleId,
              phoneNumber: intent.phoneNumber,
              paymentMethod: "momo",
              paystackReference: reference,
              details: { paymentMethod: "momo", paystackReference: reference },
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) { handleApiError(data); return; }
          setStatus("success");
          setMessage("Your data bundle purchase was successful!");
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
          setTimeout(() => navigate("/orders"), 2500);
        }
      } catch {
        setStatus("error");
        setMessage("Payment verification failed. Please contact support.");
      }
    };

    verify();
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Confirming your payment…</h2>
          <p className="text-gray-500 mt-2">Please wait while we verify your transaction.</p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="w-14 h-14 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Payment confirmed!</h2>
          <p className="text-gray-600 mt-2">{message}</p>
          <p className="text-sm text-gray-400 mt-1">Redirecting you now…</p>
        </>
      )}

      {status === "cancelled" && (
        <>
          <XOctagon className="w-14 h-14 text-amber-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Payment cancelled</h2>
          <p className="text-gray-500 mt-2">No money was taken from your account.</p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => navigate("/wallet")}>Go to Wallet</Button>
            <Button onClick={() => navigate("/bundles")}>Try Again</Button>
          </div>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="w-14 h-14 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
          <p className="text-gray-600 mt-2 max-w-sm">{message}</p>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => navigate("/wallet")}>Go to Wallet</Button>
            <Button onClick={() => navigate("/bundles")}>Browse Bundles</Button>
          </div>
        </>
      )}
    </div>
  );
}
