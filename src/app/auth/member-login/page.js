"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";
import Spinner from "@/components/ui/Spinner";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated } = useMemberAuth();

  const requested = searchParams.get('from') || '';
  const from = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  useEffect(() => {
    if (isAuthenticated) {
      router.push(from);
    }
  }, [isAuthenticated, router, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signIn(email, password);
      router.push(from);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <Notice tone="error">{error}</Notice>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gatech.edu"
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}

export default function MemberLoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-md rounded-[30px] bg-paper p-8 sm:p-10">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted">Brothers</p>
        <h1 className="mt-2 text-center font-display text-2xl uppercase tracking-[0.08em]">Sign in</h1>

        <Suspense fallback={<Spinner />}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/auth/member-register" className="text-ink underline underline-offset-4">
            Create an account
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link href="/auth/login" className="text-xs uppercase tracking-[0.2em] text-muted hover:text-ink">
            Admin
          </Link>
        </p>
      </div>
    </div>
  );
}
