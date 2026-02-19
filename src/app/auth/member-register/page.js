"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemberAuth } from "@/lib/MemberAuthContext";

// Registration form component
function RegistrationForm() {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { signUp } = useMemberAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate inputs
    if (email !== confirmEmail) {
      setError("Email addresses do not match");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password should be at least 8 characters");
      return;
    }
    
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await signUp(email, password, firstName, lastName, accessCode);
      router.push("/auth/member-login?registered=true");
    } catch (err) {
      console.error("Registration error:", err);
      setError(
        err.message || 
        "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-[#1d1d1f]">Create Member Account</h1>
        <p className="mt-2 text-sm text-[#6e6e73]">
          Register as a fraternity member
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
            <label htmlFor="email" className="block text-sm font-medium text-[#1d1d1f] mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label htmlFor="confirmEmail" className="block text-sm font-medium text-[#1d1d1f] mb-1">
              Confirm email address
            </label>
            <input
              id="confirmEmail"
              name="confirmEmail"
              type="email"
              required
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-[#1d1d1f] mb-1">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
              placeholder="John"
            />
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-[#1d1d1f] mb-1">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
              placeholder="Doe"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#1d1d1f] mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1d1d1f] mb-1">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="accessCode" className="block text-sm font-medium text-[#1d1d1f] mb-1">
              Access code
            </label>
            <input
              id="accessCode"
              name="accessCode"
              type="text"
              required
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="block w-full appearance-none rounded-xl border border-[#d2d2d7] px-3 py-2.5 text-[#1d1d1f] placeholder-[#86868b] focus:border-[#0071e3] focus:outline-none focus:ring-1 focus:ring-[#0071e3] sm:text-sm"
              placeholder="Fraternity access code"
            />
            <p className="mt-1 text-xs text-[#6e6e73]">
              Please enter the fraternity access code provided to you
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-apple w-full py-2.5"
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
          
          <div className="flex justify-between text-sm">
            <Link href="/" className="text-[#0071e3] hover:text-[#0077ed] transition-colors">
              Return to home
            </Link>
            <Link href="/auth/member-login" className="text-[#0071e3] hover:text-[#0077ed] transition-colors">
              Already have an account?
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

// Loading fallback component
function RegistrationFormLoading() {
  return (
    <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-8 shadow-sm">
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded-md animate-pulse w-3/4 mx-auto mb-4"></div>
        <div className="h-4 bg-gray-200 rounded-md animate-pulse w-4/5 mx-auto"></div>
      </div>
      
      <div className="space-y-4 mt-8">
        {/* Form field placeholders */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-md animate-pulse w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-full"></div>
          </div>
        ))}
        
        <div className="h-12 bg-gray-200 rounded-xl animate-pulse w-full mt-6"></div>
      </div>
    </div>
  );
}

export default function MemberRegisterPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12 bg-[#f5f5f7]">
      <Suspense fallback={<RegistrationFormLoading />}>
        <RegistrationForm />
      </Suspense>
    </div>
  );
} 