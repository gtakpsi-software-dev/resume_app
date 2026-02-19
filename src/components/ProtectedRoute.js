'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMemberAuth } from '@/lib/MemberAuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useMemberAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      console.log('ProtectedRoute: Not authenticated, redirecting to login');
      router.push('/auth/member-login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  // Show loading state or nothing while checking auth
  if (isLoading || !mounted || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-center">
          <div className="text-lg font-medium">Loading...</div>
          <div className="text-sm text-gray-500">Please wait while we verify your access</div>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  return children;
}
