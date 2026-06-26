"use client";

import { useAuth } from "../lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg">
            <RefreshCw className="h-6 w-6 text-white animate-spin" />
          </div>
          <div className="space-y-2 text-center">
            <div className="h-3 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto" />
            <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
