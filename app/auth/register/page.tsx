import AuthPageClient from "@/app/components/auth-page-client";

interface AuthRegisterPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizeNext(input: string | string[] | undefined): string {
  if (typeof input === "string" && input.startsWith("/")) {
    return input;
  }
  return "/planner";
}

export default async function AuthRegisterPage({ searchParams }: AuthRegisterPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNext(params.next);

  return <AuthPageClient mode="register" nextPath={nextPath} />;
}
