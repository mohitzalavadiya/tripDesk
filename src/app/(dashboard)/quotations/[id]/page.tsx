import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface QuotationRedirectPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotationRedirectPage({ params }: QuotationRedirectPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirectTo=/quotations/${encodeURIComponent(id)}`);
  }

  // Find quotation with strict tenant isolation
  const agencyId = user.agency?.id;
  const quotation = await prisma.quotation.findFirst({
    where: {
      id,
      ...(user.isPlatformOwner ? {} : agencyId ? { agencyId } : { agencyId: "NONE" }),
    },
    select: {
      id: true,
      tripId: true,
    },
  });

  if (quotation?.tripId) {
    redirect(`/trips/${quotation.tripId}/quotation`);
  }

  // Graceful fallback if quotation was deleted or belongs to another agency: return to quotations list
  redirect("/quotations");
}
