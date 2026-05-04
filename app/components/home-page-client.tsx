"use client";

import { useRouter } from "next/navigation";

import HomeMainStage from "@/app/components/home/main-stage";

export default function HomePageClient() {
  const router = useRouter();

  return (
    <HomeMainStage
      embedded
      onOpenPlanner={() => router.push("/planner", { scroll: false })}
      onOpenLogin={() => router.push("/auth/login?next=/planner", { scroll: false })}
    />
  );
}
