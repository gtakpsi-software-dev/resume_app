import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/Button";
import HomeGate from "@/components/home/HomeGate";

const sections = [
  {
    title: "Resumes",
    href: "/resumes",
    body: "Search every brother's resume by name, major, company, or skill, or describe who you are looking for and let AI search find them.",
  },
  {
    title: "Alumni",
    href: "/alumni",
    body: "See where Epsilon Sigma brothers went after Georgia Tech and reach out to alumni in the industries you are aiming for.",
  },
  {
    title: "Experiences",
    href: "/dashboard",
    body: "Read and share interview, internship, and research write-ups from brothers who have already been through the process.",
  },
];

export default function Home() {
  return (
    <HomeGate>
      <section className="relative overflow-hidden bg-ink-deep text-paper">
        <Image
          src="/gtakpsi_logo.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-125 object-cover opacity-35 blur-2xl"
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-5 py-24 text-center sm:px-8 sm:py-32">
          <Image src="/gtakpsi_logo.png" alt="Alpha Kappa Psi Georgia Tech crest" width={140} height={140} className="mb-10 rounded-full shadow-2xl" />
          <h1 className="font-display text-4xl uppercase tracking-[0.08em] sm:text-6xl">Alpha Kappa Psi</h1>
          <p className="mt-5 max-w-xl text-lg text-paper/80">
            The Epsilon Sigma Chapter&apos;s resume book and alumni network.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button href="/resumes" variant="inverse" size="lg">
              Search resumes
            </Button>
            <Button href="/alumni" variant="light" size="lg">
              Meet alumni
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto grid max-w-6xl px-5 py-20 sm:px-8 md:grid-cols-3 md:gap-10">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="group border-t border-line py-8 md:border-t-2 md:border-ink">
              <h2 className="font-display text-2xl uppercase tracking-[0.08em]">{s.title}</h2>
              <p className="mt-3 text-muted">{s.body}</p>
              <span className="mt-6 inline-block font-display text-xs uppercase tracking-[0.2em] text-ink group-hover:underline underline-offset-4">
                Open {s.title} &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

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
    </HomeGate>
  );
}
