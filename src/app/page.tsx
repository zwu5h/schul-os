import { SchoolApp } from "@/components/school-app";
import { auth } from "@/lib/server-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <SchoolApp userId={session.user.id} />;
}
