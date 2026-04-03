"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { adminLogin } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      await adminLogin(password);
      // Redirect to admin upload page on success
      router.push("/admin/upload");
    } catch (err) {
      console.error("Admin login error:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Login failed. Please check your password."
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 bg-[#f5f5f7]">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-[#1d1d1f]">Administrator Access</h1>
          <p className="mt-2 text-sm text-[#6e6e73]">
            Enter the admin password to access the resume management system
          </p>
        </div>
        
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-500 border border-red-100">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1d1d1f] mb-1">
                Admin Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
                placeholder="Enter admin password"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-apple w-full py-2.5"
            >
              {isLoading ? 'Accessing...' : 'Access Admin Panel'}
            </button>
            
            <Link href="/" className="flex justify-center text-sm text-[#0071e3] hover:text-[#0077ed] transition-colors">
              Return to home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 