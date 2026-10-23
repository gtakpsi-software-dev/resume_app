"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Spinner from "./Spinner";

export default function AdminWrapper({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const allowed = isAuthenticated && user?.role === "admin";

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.push("/auth/login");
    }
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) {
    return <Spinner className="flex-1 items-center" />;
  }

  return children;
}
