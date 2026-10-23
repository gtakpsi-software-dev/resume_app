"use client";

import SearchLanding from "@/components/search/SearchLanding";
import { useAuth } from "@/lib/AuthContext";
import { useMemberAuth } from "@/lib/MemberAuthContext";

export default function HomeGate({ children }) {
  const { isAuthenticated: isAdmin, isLoading: adminLoading } = useAuth();
  const { isAuthenticated: isMember, isLoading: memberLoading } = useMemberAuth();

  if (adminLoading || memberLoading) return <div className="flex-1 bg-ink" />;
  if (isAdmin || isMember) return <SearchLanding />;
  return children;
}
