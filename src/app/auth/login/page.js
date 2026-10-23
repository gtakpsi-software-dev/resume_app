"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";

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
      router.push("/admin/upload");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-md rounded-[30px] bg-paper p-8 sm:p-10">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted">Chapter officers</p>
        <h1 className="mt-2 text-center font-display text-2xl uppercase tracking-[0.08em]">Admin access</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Notice tone="error">{error}</Notice>
          <div>
            <Label htmlFor="password">Admin password</Label>
            <Input
              id="password"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Checking..." : "Continue"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          Not an officer?{" "}
          <Link href="/auth/member-login" className="text-ink underline underline-offset-4">
            Member sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
