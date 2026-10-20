import { SchoolApp } from "@/components/school-app";
import { auth } from "@/lib/server-auth";
import { headers } from "next/headers";
import { LandingPage } from "@/components/landing-page";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <LandingPage />;
  return <SchoolApp userId={session.user.id} />;
}
