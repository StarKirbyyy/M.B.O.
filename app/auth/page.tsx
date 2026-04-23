import { redirect } from "next/navigation";

interface AuthPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizeNext(input: string | string[] | undefined): string | null {
  if (typeof input === "string" && input.startsWith("/")) {
    return input;
  }
  return null;
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNext(params.next);
  if (nextPath) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }
  redirect("/auth/login");
}
