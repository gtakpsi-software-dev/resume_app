"use client";

import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminWrapper({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const allowed = isAuthenticated && user?.role === "admin";

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.push("/auth/login");
    }
  }, [isLoading, allowed, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

  return <>{children}</>;
} 