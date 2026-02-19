"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import LogoutButton from "./LogoutButton";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { user: memberUser, isAuthenticated: isMemberAuthenticated, isLoading: isMemberLoading, signOut: memberSignOut } = useMemberAuth();
  const [scrolled, setScrolled] = useState(false);
  
  // Debug auth state
  useEffect(() => {
    console.log('Header component - Member auth state:', {
      isAuthenticated: isMemberAuthenticated,
      isLoading: isMemberLoading,
      user: memberUser ? `${memberUser.email} (${memberUser.id})` : 'none'
    });
  }, [isMemberAuthenticated, isMemberLoading, memberUser]);
  
  // Function to check if a path is active
  const isActive = (path) => {
    return pathname === path ? "text-[#0071e3]" : "";
  };

  // Check if user is admin
  const isAdmin = user?.role === "admin";

  // Handle resume search button click
  const handleResumeSearchClick = (e) => {
    e.preventDefault();
    // If user is not authenticated as member, redirect to login page
    if (!isMemberAuthenticated && !isMemberLoading) {
      router.push('/auth/member-login');
    } else {
      router.push('/search');
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await memberSignOut();
      // Navigate to the homepage without a full reload to avoid flicker
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Apply scrolled styles to header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-white"}`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-[#1d1d1f] font-semibold text-lg">GT Alpha Kappa Psi</span>
            </Link>
            <div className="hidden ml-10 space-x-8 md:flex">
              <Link 
                href="/search" 
                className={`text-sm font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors ${isActive('/search')}`}
                onClick={handleResumeSearchClick}
              >
                Resume Search
              </Link>
              
              {isAdmin && (
                <Link 
                  href="/admin/upload" 
                  className={`text-sm font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors ${isActive('/admin/upload')}`}
                >
                  Upload
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Member User Authentication */}
            {isMemberLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-full bg-gray-200"></div>
            ) : isMemberAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-[#1d1d1f]">
                  {memberUser.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/member-login"
                  className="text-sm font-medium text-[#0071e3] hover:text-[#0077ed] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/member-register"
                  className="text-sm font-medium bg-[#0071e3] text-white hover:bg-[#0077ed] px-3 py-1 rounded-lg transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Admin Authentication - keep this separate */}
            {isLoading ? (
              <div className="h-8 w-6 animate-pulse rounded-full bg-gray-200"></div>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-[#1d1d1f]">
                  {user.firstName} {user.lastName}
                </span>
                <LogoutButton />
              </div>
            ) : (
              <div className="hidden opacity-60 hover:opacity-100 transition-opacity text-xs text-gray-400 md:block">
                <Link 
                  href="/auth/login" 
                  className="text-xs text-gray-400 hover:text-gray-800"
                  aria-label="Admin login"
                >
                  •••
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className="py-2 flex justify-center space-x-6 md:hidden border-t border-gray-100">
          <Link 
            href="/search" 
            className={`text-sm font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors ${isActive('/search')}`}
            onClick={handleResumeSearchClick}
          >
            Resume Search
          </Link>
          
          {isAdmin && (
            <Link 
              href="/admin/upload" 
              className={`text-sm font-medium text-[#1d1d1f] hover:text-[#0071e3] transition-colors ${isActive('/admin/upload')}`}
            >
              Upload
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
} 