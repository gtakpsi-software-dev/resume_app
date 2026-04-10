'use client';

import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const { logout, isAuthenticated } = useAuth();
  const router = useRouter();
  
  if (!isAuthenticated) return null;
  
  const handleLogout = () => {
    logout();
    router.push('/');
  };
  
  return (
    <button
      onClick={handleLogout}
      className="text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors"
      aria-label="Sign out of your account"
    >
      Sign Out
    </button>
  );
} 