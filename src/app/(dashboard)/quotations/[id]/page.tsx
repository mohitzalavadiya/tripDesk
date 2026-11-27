import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { staffPermissionService } from "@/lib/services/staff-permission-service";

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

  // Check staff view permission
  if (!user.isPlatformOwner && user.isAgencyStaff && user.agency?.id) {
    const canView = await staffPermissionService.hasStaffPermission(
      user.dbUser.role,
      user.agency.id,
      user.dbUser.id,
      "QUOTATIONS",
      "VIEW"
    );
    if (!canView) {
      redirect("/quotations");
    }
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
