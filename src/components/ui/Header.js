"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/AuthContext";
import { useMemberAuth } from "@/lib/MemberAuthContext";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated: isAdmin, isLoading: adminLoading, logout } = useAuth();
  const { user: member, isAuthenticated: isMember, isLoading: memberLoading, signOut } = useMemberAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);

  const links = [
    { href: "/search", label: "Resumes" },
    { href: "/alumni", label: "Alumni" },
    ...(isMember ? [{ href: "/dashboard", label: "Experiences" }] : []),
    ...(isAdmin ? [{ href: "/admin/upload", label: "Upload" }] : []),
  ];

  const handleSignOut = async () => {
    if (isAdmin) logout();
    else await signOut();
    router.push("/");
  };

  const loading = adminLoading || memberLoading;
  const signedIn = isAdmin || isMember;

  const navText = "font-display text-sm uppercase tracking-[0.18em] transition-colors";
  const linkClass = (href) =>
    `${navText} ${pathname.startsWith(href) ? "text-paper" : "text-paper/60 hover:text-paper"}`;

  const account = loading ? (
    <div className="h-4 w-20 animate-pulse rounded-full bg-paper/20" />
  ) : signedIn ? (
    <div className="flex items-center gap-5">
      <span className="hidden text-sm text-paper/60 lg:inline">{isAdmin ? "Admin" : member?.email}</span>
      <button type="button" onClick={handleSignOut} className={`${navText} text-paper/60 hover:text-paper`}>
        Sign out
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-5">
      <Link href="/auth/member-login" className={linkClass("/auth/member-login")}>
        Sign in
      </Link>
      <Link
        href="/auth/member-register"
        className={`${navText} rounded-full border border-paper/70 px-4 py-1.5 text-paper hover:bg-paper hover:text-ink`}
      >
        Join
      </Link>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-ink text-paper">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8" aria-label="Main">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl tracking-[0.1em]">ΑΚΨ</span>
          <span className="hidden font-display text-xs uppercase tracking-[0.3em] text-paper/60 sm:inline">Georgia Tech</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">{account}</div>

        <button
          type="button"
          className="rounded-full p-2 text-paper/80 hover:text-paper md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-paper/10 px-5 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-6 border-t border-paper/10 pt-5">{account}</div>
        </div>
      )}
    </header>
  );
}
