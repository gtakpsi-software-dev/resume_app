'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useAuth } from '@/lib/AuthContext';
import Spinner from '@/components/ui/Spinner';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated: memberIsAuthenticated, isLoading: memberIsLoading } = useMemberAuth();
  const { isAuthenticated: adminIsAuthenticated, isLoading: adminIsLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isChecking = memberIsLoading || adminIsLoading;
  const isAllowed = memberIsAuthenticated || adminIsAuthenticated;

  useEffect(() => {
    if (!isChecking && !isAllowed) {
      router.push(`/auth/member-login?from=${encodeURIComponent(pathname)}`);
    }
  }, [isAllowed, isChecking, router, pathname]);

  if (isChecking || !isAllowed) {
    return <Spinner className="flex-1 items-center" />;
  }

  return children;
}
