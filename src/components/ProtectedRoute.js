'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberAuth } from '@/lib/MemberAuthContext';
import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated: memberIsAuthenticated, isLoading: memberIsLoading } = useMemberAuth();
  const { isAuthenticated: adminIsAuthenticated, isLoading: adminIsLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const isChecking = memberIsLoading || adminIsLoading;
  const isAllowed = memberIsAuthenticated || adminIsAuthenticated;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isChecking && !isAllowed) {
      console.log('ProtectedRoute: Not authenticated, redirecting to login');
      router.push('/auth/member-login');
    }
  }, [isAllowed, isChecking, router, mounted]);

  // Show loading state or nothing while checking auth
  if (isChecking || !mounted || !isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="text-lg font-medium">Loading...</div>
          <div className="text-sm text-gray-500">Please wait while we verify your access</div>
        </div>
      </div>
    );
  }

  // If authenticated (member or admin), render children
  return children;
}
