import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

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
