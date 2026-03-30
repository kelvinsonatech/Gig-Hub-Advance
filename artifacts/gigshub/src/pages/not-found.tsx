import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404</h1>
        <p className="text-xl font-semibold text-gray-700 mb-3">Page Not Found</p>
        <p className="text-gray-500 text-sm mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="rounded-xl">
            <Link href="/login">
              <ArrowLeft className="mr-2 w-4 h-4" /> Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/bundles">Browse Data Bundles</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
