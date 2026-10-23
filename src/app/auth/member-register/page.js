"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemberAuth } from "@/lib/MemberAuthContext";
import Button from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import Notice from "@/components/ui/Notice";

const initialForm = {
  email: "",
  confirmEmail: "",
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
  accessCode: "",
};

export default function MemberRegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signUp } = useMemberAuth();

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (form.email !== form.confirmEmail) return "Email addresses do not match";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (form.password.length < 8) return "Password should be at least 8 characters";
    if (!form.firstName.trim() || !form.lastName.trim()) return "First name and last name are required";
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    setIsLoading(true);
    try {
      await signUp(form.email, form.password, form.firstName, form.lastName, form.accessCode);
      router.push("/auth/member-login?registered=true");
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-ink px-5 py-16">
      <div className="w-full max-w-lg rounded-[30px] bg-paper p-8 sm:p-10">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-muted">Brothers</p>
        <h1 className="mt-2 text-center font-display text-2xl uppercase tracking-[0.08em]">Create account</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Notice tone="error">{error}</Notice>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" autoComplete="given-name" required value={form.firstName} onChange={update("firstName")} />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" autoComplete="family-name" required value={form.lastName} onChange={update("lastName")} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={update("email")} placeholder="you@gatech.edu" />
          </div>
          <div>
            <Label htmlFor="confirmEmail">Confirm email</Label>
            <Input id="confirmEmail" type="email" autoComplete="email" required value={form.confirmEmail} onChange={update("confirmEmail")} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="password" hint="8+ characters">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" required value={form.password} onChange={update("password")} />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={update("confirmPassword")} />
            </div>
          </div>
          <div>
            <Label htmlFor="accessCode" hint="Ask a chapter officer">Access code</Label>
            <Input id="accessCode" required value={form.accessCode} onChange={update("accessCode")} />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-muted">
          Already a member?{" "}
          <Link href="/auth/member-login" className="text-ink underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
