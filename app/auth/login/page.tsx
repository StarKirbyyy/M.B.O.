import AuthPageClient from "@/app/components/auth-page-client";

interface AuthLoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function normalizeNext(input: string | string[] | undefined): string {
  if (typeof input === "string" && input.startsWith("/")) {
    return input;
  }
  return "/planner";
}

export default async function AuthLoginPage({ searchParams }: AuthLoginPageProps) {
  const params = await searchParams;
  const nextPath = normalizeNext(params.next);

  return <AuthPageClient mode="login" nextPath={nextPath} layoutMode="embedded" />;
}
