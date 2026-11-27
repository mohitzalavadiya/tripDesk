import fs from "fs";
import path from "path";

const targetPath = path.resolve(process.cwd(), "src/lib/services/enquiry-service.ts");
let content = fs.readFileSync(targetPath, "utf8");

// 1. createFollowUp signature and audit log
if (!content.includes("async createFollowUp(\n    agencyId: string,\n    enquiryId: string,\n    data: CreateFollowUpInput,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async createFollowUp(\n    agencyId: string,\n    enquiryId: string,\n    data: CreateFollowUpInput\n  ): Promise<EnquiryFollowUp> {',
    '  async createFollowUp(\n    agencyId: string,\n    enquiryId: string,\n    data: CreateFollowUpInput,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<EnquiryFollowUp> {'
  );
}

const createFollowUpAudit = `      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "FOLLOW_UP_SCHEDULED",
        entityType: "ENQUIRY",
        entityId: enquiryId,
        metadata: {
          actorName: actor?.userName || "Team Member",
          actorRole: actor?.role,
          followUpId: f.id,
          type: f.type,
          scheduledAt: f.scheduledAt,
          notes: f.notes,
          summary: \`\${f.type} follow-up scheduled for \${new Date(f.scheduledAt).toLocaleString("en-IN")}\`,
        },
      }, tx).catch(() => {});

      return f;`;

if (!content.includes('action: "FOLLOW_UP_SCHEDULED"')) {
  content = content.replace(
    '      return f;',
    createFollowUpAudit
  );
}

// 2. updateFollowUp signature and audit log
if (!content.includes("async updateFollowUp(\n    agencyId: string,\n    followUpId: string,\n    data: UpdateFollowUpInput,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async updateFollowUp(\n    agencyId: string,\n    followUpId: string,\n    data: UpdateFollowUpInput\n  ): Promise<EnquiryFollowUp> {',
    '  async updateFollowUp(\n    agencyId: string,\n    followUpId: string,\n    data: UpdateFollowUpInput,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<EnquiryFollowUp> {'
  );
}

const updateFollowUpCompletedAudit = `      const completed = (await prisma.enquiryFollowUp.findUnique({
        where: { id: followUpId },
      }))!;

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "FOLLOW_UP_COMPLETED",
        entityType: "ENQUIRY",
        entityId: followUp.enquiryId,
        metadata: {
          actorName: actor?.userName || "Team Member",
          actorRole: actor?.role,
          followUpId,
          outcome: data.outcome || followUp.outcome || null,
          notes: cleanNewNotes || null,
          summary: \`\${followUp.type} follow-up completed\${data.outcome ? \` • \${data.outcome}\` : ""}\`,
        },
      }).catch(() => {});

      return {
        ...completed,
        notes: stripIdempotencyMarker(completed.notes) || null,
      };`;

if (!content.includes('action: "FOLLOW_UP_COMPLETED"')) {
  content = content.replace(
    `      const completed = (await prisma.enquiryFollowUp.findUnique({
        where: { id: followUpId },
      }))!;

      return {
        ...completed,
        notes: stripIdempotencyMarker(completed.notes) || null,
      };`,
    updateFollowUpCompletedAudit
  );
}

// 3. deleteFollowUp signature and audit log
if (!content.includes("async deleteFollowUp(\n    agencyId: string,\n    followUpId: string,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async deleteFollowUp(agencyId: string, followUpId: string): Promise<EnquiryFollowUp> {',
    '  async deleteFollowUp(\n    agencyId: string,\n    followUpId: string,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<EnquiryFollowUp> {'
  );
}

const deleteFollowUpAudit = `    const archived = await prisma.enquiryFollowUp.update({
      where: { id: followUpId },
      data: { archivedAt: new Date() },
    });

    await agencyAuditService.logEvent({
      agencyId,
      actorUserId: actor?.userId || "SYSTEM",
      action: "FOLLOW_UP_CANCELLED",
      entityType: "ENQUIRY",
      entityId: followUp.enquiryId,
      metadata: {
        actorName: actor?.userName || "Team Member",
        actorRole: actor?.role,
        followUpId,
        summary: \`\${followUp.type} follow-up cancelled / archived\`,
      },
    }).catch(() => {});

    return archived;`;

if (!content.includes('action: "FOLLOW_UP_CANCELLED"')) {
  content = content.replace(
    `    return prisma.enquiryFollowUp.update({
      where: { id: followUpId },
      data: { archivedAt: new Date() },
    });`,
    deleteFollowUpAudit
  );
}

// 4. logInteraction signature and audit log
if (!content.includes("async logInteraction(\n    agencyId: string,\n    enquiryId: string,\n    data: QuickLogInteractionInput,\n    userId?: string,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async logInteraction(\n    agencyId: string,\n    enquiryId: string,\n    data: QuickLogInteractionInput,\n    userId?: string\n  ): Promise<{ interaction: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }> {',
    '  async logInteraction(\n    agencyId: string,\n    enquiryId: string,\n    data: QuickLogInteractionInput,\n    userId?: string,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<{ interaction: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }> {'
  );
}

const logInteractionAudit = `      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || userId || "SYSTEM",
        action: "INTERACTION_LOGGED",
        entityType: "ENQUIRY",
        entityId: enquiryId,
        metadata: {
          actorName: actor?.userName || (userId ? "Team Member" : "System"),
          actorRole: actor?.role,
          type: data.type,
          outcome: data.outcome,
          notes: data.notes,
          nextFollowUpAt: data.nextFollowUpAt,
          summary: \`Interaction logged: \${data.type}\${data.outcome ? \` (\${data.outcome})\` : ""}\`,
        },
      }, tx).catch(() => {});

      return {
        interaction: {`;

if (!content.includes('action: "INTERACTION_LOGGED"')) {
  content = content.replace(
    '      return {\n        interaction: {',
    logInteractionAudit
  );
}

fs.writeFileSync(targetPath, content, "utf8");
console.log("Follow-ups and quick interaction successfully patched in enquiry-service.ts");

