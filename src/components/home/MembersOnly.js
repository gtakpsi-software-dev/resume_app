"use client";

import Button from "@/components/ui/Button";
import { useAuth } from "@/lib/AuthContext";
import { useMemberAuth } from "@/lib/MemberAuthContext";

export default function MembersOnly() {
  const { isAuthenticated: isAdmin, isLoading: adminLoading } = useAuth();
  const { isAuthenticated: isMember, isLoading: memberLoading } = useMemberAuth();

  if (adminLoading || memberLoading || isAdmin || isMember) return null;

  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-8">
        <h2 className="font-display text-2xl uppercase tracking-[0.08em]">Members only</h2>
        <p className="mx-auto mt-4 max-w-2xl text-paper/75">
          Resumes and contact details are only visible to signed-in brothers. Ask a chapter officer for the access code to create your account.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button href="/auth/member-login" variant="inverse">
            Sign in
          </Button>
          <Button href="/auth/member-register" variant="light">
            Create account
          </Button>
        </div>
      </div>
    </section>
  );
}
