import { redirect } from "next/navigation";

export default async function Search({ searchParams }) {
  const params = new URLSearchParams(await searchParams);
  const qs = params.toString();
  redirect(qs ? `/resumes?${qs}` : "/resumes");
}
