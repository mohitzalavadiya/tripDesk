import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const auth = await getCurrentUser();

  if (!auth) {
    redirect("/login");
  }

  if (auth.isPlatformOwner) {
    redirect("/admin");
  }

  redirect("/dashboard");
}
