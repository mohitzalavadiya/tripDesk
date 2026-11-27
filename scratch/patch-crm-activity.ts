import fs from "fs";
import path from "path";

const targetPath = path.resolve(process.cwd(), "src/lib/services/enquiry-service.ts");
let content = fs.readFileSync(targetPath, "utf8");

// 1. Add agencyAuditService import if not present
if (!content.includes('import { agencyAuditService } from "./agency-audit-service";')) {
  content = content.replace(
    'import { tripService } from "./trip-service";',
    'import { tripService } from "./trip-service";\nimport { agencyAuditService } from "./agency-audit-service";'
  );
}

// 2. Extend CrmTimelineEvent type
if (!content.includes('"FIELD_UPDATED"')) {
  content = content.replace(
    '    | "LEAD_REASSIGNED";',
    '    | "LEAD_REASSIGNED"\n    | "FIELD_UPDATED"\n    | "FOLLOW_UP_CANCELLED"\n    | "INTERACTION_LOGGED";'
  );
}

if (!content.includes("actorName?: string;")) {
  content = content.replace(
    '  statusBadge?: string;\n  metadata?: Record<string, any>;',
    '  statusBadge?: string;\n  actorName?: string;\n  actorRole?: string;\n  changes?: Array<{ field: string; label: string; oldValue?: any; newValue?: any }>;\n  metadata?: Record<string, any>;'
  );
}

// 3. Update getEnquiries signature and add My Enquiries filter
if (!content.includes("authenticatedUser?: { userId: string; userName?: string | null }")) {
  content = content.replace(
    '  async getEnquiries(\n    agencyId: string,\n    query: Partial<EnquiryQueryInput> = {}\n  ): Promise<{ data: EnquiryWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {',
    '  async getEnquiries(\n    agencyId: string,\n    query: Partial<EnquiryQueryInput> = {},\n    authenticatedUser?: { userId: string; userName?: string | null }\n  ): Promise<{ data: EnquiryWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {'
  );
}

const myEnquiriesFilterCode = `    if ((query.scope === "my" || (query as any).myEnquiries === true) && authenticatedUser?.userId) {
      const myUid = authenticatedUser.userId;
      const myName = authenticatedUser.userName?.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { assignedToUserId: myUid },
            ...(myName ? [{ assignedTo: { equals: myName, mode: "insensitive" as const } }] : []),
            { assignedTo: myUid },
          ],
        },
        {
          NOT: [
            { assignedTo: null, assignedToUserId: null },
          ],
        },
      ];
    }
`;

if (!content.includes('query.scope === "my"')) {
  const marker = '    if (urgency && urgency !== "all") {';
  content = content.replace(marker, myEnquiriesFilterCode + "\n" + marker);
}

// 4. Update createEnquiry to accept actor and log event
if (!content.includes("actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async createEnquiry(\n    agencyId: string,\n    data: CreateEnquiryInput\n  ): Promise<EnquiryWithRelations> {',
    '  async createEnquiry(\n    agencyId: string,\n    data: CreateEnquiryInput,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<EnquiryWithRelations> {'
  );
}

const createAuditLogging = `    if (actor?.userId) {
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor.userId,
        action: "ENQUIRY_CREATED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        metadata: {
          actorName: actor.userName || "Team Member",
          actorRole: actor.role,
          summary: \`Lead \${enquiry.enquiryNumber} captured for \${enquiry.destination}\`,
        },
      }).catch(() => {});
    }

    return enquiry as EnquiryWithRelations;`;

if (!content.includes('action: "ENQUIRY_CREATED"')) {
  content = content.replace(
    '    return enquiry as EnquiryWithRelations;',
    createAuditLogging
  );
}

// 5. Update updateEnquiry to accept actor and compute diffs
if (!content.includes("async updateEnquiry(\n    agencyId: string,\n    enquiryId: string,\n    data: UpdateEnquiryInput,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async updateEnquiry(\n    agencyId: string,\n    enquiryId: string,\n    data: UpdateEnquiryInput\n  ): Promise<EnquiryWithRelations> {',
    '  async updateEnquiry(\n    agencyId: string,\n    enquiryId: string,\n    data: UpdateEnquiryInput,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<EnquiryWithRelations> {'
  );
}

const updateAuditLogging = `    const updated = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
        convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
        followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
      },
    });

    // Detect changed fields and record audit history
    const changes: Array<{ field: string; label: string; oldValue?: any; newValue?: any }> = [];
    const fieldMap: Record<string, string> = {
      title: "Title",
      destination: "Destination",
      origin: "Origin",
      startDate: "Start Date",
      endDate: "End Date",
      adults: "Adults",
      children: "Children",
      infants: "Infants",
      budget: "Budget",
      budgetType: "Budget Type",
      currency: "Currency",
      hotelCategory: "Hotel Category",
      mealPlan: "Meal Plan",
      vehiclePreference: "Vehicle Preference",
      transportRequired: "Transport Required",
      source: "Source",
      priority: "Priority",
      status: "Stage",
      specialRequirements: "Special Requirements",
      notes: "Notes",
      internalNotes: "Internal Notes",
      assignedTo: "Assignee",
      lostReason: "Lost Reason",
    };
    for (const [key, label] of Object.entries(fieldMap)) {
      if ((data as any)[key] !== undefined) {
        const oldVal = (enquiry as any)[key];
        const newVal = (data as any)[key];
        const oldStr = oldVal instanceof Date ? oldVal.toISOString().split("T")[0] : String(oldVal ?? "");
        const newStr = newVal instanceof Date ? newVal.toISOString().split("T")[0] : String(newVal ?? "");
        if (oldStr !== newStr) {
          changes.push({
            field: key,
            label,
            oldValue: oldVal instanceof Prisma.Decimal ? Number(oldVal) : oldVal,
            newValue: newVal,
          });
        }
      }
    }

    if (changes.length > 0 && (actor?.userId || actor?.userName)) {
      const isStageChange = changes.some((c) => c.field === "status");
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: isStageChange ? "STAGE_CHANGED" : "ENQUIRY_UPDATED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        previousState: enquiry,
        newState: data,
        metadata: {
          actorName: actor?.userName || (actor?.userId ? "Team Member" : "System"),
          actorRole: actor?.role,
          changes,
          summary: isStageChange
            ? \`Stage changed from \${(enquiry as any).status} to \${data.status}\`
            : \`\${changes.length} field(s) updated: \${changes.map((c) => c.label).join(", ")}\`,
          previousStatus: (enquiry as any).status,
          newStatus: data.status,
        },
      }).catch(() => {});
    }

    return updated as EnquiryWithRelations;`;

if (!content.includes('action: isStageChange ? "STAGE_CHANGED" : "ENQUIRY_UPDATED"')) {
  content = content.replace(
    `    const updated = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
        convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
        followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
      },
    });

    return updated as EnquiryWithRelations;`,
    updateAuditLogging
  );
}

// 6. Update transitionStage to accept actor and record audit log
if (!content.includes("async transitionStage(\n    agencyId: string,\n    enquiryId: string,\n    data: TransitionStageInput,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async transitionStage(\n    agencyId: string,\n    enquiryId: string,\n    data: TransitionStageInput\n  ): Promise<EnquiryWithRelations> {',
    '  async transitionStage(\n    agencyId: string,\n    enquiryId: string,\n    data: TransitionStageInput,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<EnquiryWithRelations> {'
  );
}

const transitionAuditLogging = `    const updated = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
        convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
        followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
      },
    });

    if (actor?.userId || actor?.userName) {
      const isLost = data.status === EnquiryStatus.LOST;
      const changes = [
        { field: "status", label: "Stage", oldValue: enquiry.status, newValue: data.status },
        ...(isLost && data.lostReason ? [{ field: "lostReason", label: "Lost Reason", oldValue: enquiry.lostReason, newValue: data.lostReason }] : []),
      ];
      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: isLost ? "ENQUIRY_LOST" : "STAGE_CHANGED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        metadata: {
          actorName: actor?.userName || (actor?.userId ? "Team Member" : "System"),
          actorRole: actor?.role,
          changes,
          previousStatus: enquiry.status,
          newStatus: data.status,
          lostReason: data.lostReason,
          lostExplanation: data.lostExplanation,
          summary: isLost
            ? \`Marked as LOST: \${data.lostReason || "Unspecified"}\`
            : \`Stage changed from \${enquiry.status} to \${data.status}\`,
        },
      }).catch(() => {});
    }

    return updated as EnquiryWithRelations;`;

if (!content.includes('action: isLost ? "ENQUIRY_LOST" : "STAGE_CHANGED"')) {
  content = content.replace(
    `    const updated = await prisma.enquiry.update({
      where: { id: enquiryId },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
        convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
        convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
        followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
      },
    });

    return updated as EnquiryWithRelations;`,
    transitionAuditLogging
  );
}

// 7. Update markEnquiryLost to pass actor
if (!content.includes("async markEnquiryLost(\n    agencyId: string,\n    enquiryId: string,\n    data: MarkEnquiryLostInput,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async markEnquiryLost(\n    agencyId: string,\n    enquiryId: string,\n    data: MarkEnquiryLostInput\n  ): Promise<EnquiryWithRelations> {',
    '  async markEnquiryLost(\n    agencyId: string,\n    enquiryId: string,\n    data: MarkEnquiryLostInput,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<EnquiryWithRelations> {'
  );
  content = content.replace(
    '    return this.transitionStage(agencyId, enquiryId, {\n      status: EnquiryStatus.LOST,\n      lostReason: data.lostReason,\n      lostExplanation: data.lostExplanation,\n      notes: data.notes,\n    });',
    '    return this.transitionStage(agencyId, enquiryId, {\n      status: EnquiryStatus.LOST,\n      lostReason: data.lostReason,\n      lostExplanation: data.lostExplanation,\n      notes: data.notes,\n    }, actor);'
  );
}

// 8. Update reassignEnquiry to set assignedToUserId and log event
if (!content.includes("assignedToUserId: input.assignedToUserId || null,")) {
  content = content.replace(
    '        data: {\n          assignedTo: targetAssigneeName,\n        },',
    '        data: {\n          assignedTo: targetAssigneeName,\n          assignedToUserId: input.assignedToUserId || null,\n        },'
  );
}

const reassignAuditLogging = `      await tx.enquiryFollowUp.create({
        data: {
          agencyId,
          enquiryId: enquiry.id,
          type: FollowUpType.OTHER,
          status: FollowUpStatus.COMPLETED,
          scheduledAt: new Date(),
          completedAt: new Date(),
          completedBy: actor.userId,
          outcome: "LEAD_REASSIGNED",
          notes: \`[Lead Handoff] Ownership transferred from \${prevLabel} to \${newLabel} by \${actor.userName}.\${reasonSuffix}\`,
        },
      });

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor.userId,
        targetUserId: input.assignedToUserId || null,
        action: "LEAD_REASSIGNED",
        entityType: "ENQUIRY",
        entityId: enquiry.id,
        metadata: {
          actorName: actor.userName,
          changes: [
            { field: "assignedTo", label: "Assigned To", oldValue: prevOwner || "Unassigned", newValue: targetAssigneeName || "Unassigned" },
          ],
          reason: input.reason,
          summary: \`Transferred ownership from \${prevLabel} to \${newLabel}\`,
        },
      }, tx).catch(() => {});`;

if (!content.includes('action: "LEAD_REASSIGNED"')) {
  content = content.replace(
    `      await tx.enquiryFollowUp.create({
        data: {
          agencyId,
          enquiryId: enquiry.id,
          type: FollowUpType.OTHER,
          status: FollowUpStatus.COMPLETED,
          scheduledAt: new Date(),
          completedAt: new Date(),
          completedBy: actor.userId,
          outcome: "LEAD_REASSIGNED",
          notes: \`[Lead Handoff] Ownership transferred from \${prevLabel} to \${newLabel} by \${actor.userName}.\${reasonSuffix}\`,
        },
      });`,
    reassignAuditLogging
  );
}

// 9. Update convertEnquiryToTrip to accept actor and log event
if (!content.includes("async convertEnquiryToTrip(\n    agencyId: string,\n    enquiryId: string,\n    data?: ConvertEnquiryToTripInput,\n    actor?: { userId?: string; userName?: string; role?: string }")) {
  content = content.replace(
    '  async convertEnquiryToTrip(\n    agencyId: string,\n    enquiryId: string,\n    data?: ConvertEnquiryToTripInput\n  ): Promise<{ tripId: string; enquiry: EnquiryWithRelations }> {',
    '  async convertEnquiryToTrip(\n    agencyId: string,\n    enquiryId: string,\n    data?: ConvertEnquiryToTripInput,\n    actor?: { userId?: string; userName?: string; role?: string }\n  ): Promise<{ tripId: string; enquiry: EnquiryWithRelations }> {'
  );
}

const convertAuditLogging = `      const updatedEnquiry = await tx.enquiry.update({
        where: { id: enquiryId },
        data: {
          status: newStatus,
          convertedTripId: createdTrip.id,
          closedAt: null,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
          convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
          convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
          followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
        },
      });

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "ENQUIRY_CONVERTED_TO_TRIP",
        entityType: "ENQUIRY",
        entityId: enquiryId,
        metadata: {
          actorName: actor?.userName || "Team Member",
          actorRole: actor?.role,
          tripId: createdTrip.id,
          tripNumber: createdTrip.tripNumber,
          changes: [
            { field: "convertedTripId", label: "Trip Workspace", oldValue: null, newValue: createdTrip.tripNumber },
            ...(newStatus !== lockedEnquiry.status ? [{ field: "status", label: "Stage", oldValue: lockedEnquiry.status, newValue: newStatus }] : []),
          ],
          summary: \`Converted to Trip Workspace \${createdTrip.tripNumber} (\${tripTitle})\`,
        },
      }, tx).catch(() => {});`;

if (!content.includes('action: "ENQUIRY_CONVERTED_TO_TRIP"')) {
  content = content.replace(
    `      const updatedEnquiry = await tx.enquiry.update({
        where: { id: enquiryId },
        data: {
          status: newStatus,
          convertedTripId: createdTrip.id,
          closedAt: null,
        },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true, address: true } },
          convertedTrip: { select: { id: true, title: true, tripNumber: true, startDate: true, endDate: true, status: true } },
          convertedQuotation: { select: { id: true, quotationNumber: true, version: true, finalAmount: true, status: true } },
          followUps: { where: { archivedAt: null }, orderBy: { scheduledAt: "desc" } },
        },
      });`,
    convertAuditLogging
  );
}

// 10. Update getEnquiryTimeline to query agency_audit_logs and format audit entries
const timelineAuditQueryCode = `    // 5. Query persisted agency audit logs for detailed ticket change history
    const auditLogs = await prisma.agencyAuditLog.findMany({
      where: {
        agencyId,
        entityType: "ENQUIRY",
        entityId: enquiryId,
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);

    for (const log of auditLogs) {
      const meta = (log.metadata as any) || {};
      let title = "Ticket Updated";
      let description = meta.summary || "Enquiry ticket modified.";
      let type: CrmTimelineEvent["type"] = "FIELD_UPDATED";
      let statusBadge: string | undefined = undefined;

      if (log.action === "STAGE_CHANGED") {
        type = "STAGE_CHANGED";
        title = \`Stage changed to \${meta.newStatus || "New Stage"}\`;
        description = meta.summary || \`Stage updated by \${meta.actorName || "Team Member"}\`;
        statusBadge = meta.newStatus;
      } else if (log.action === "ENQUIRY_LOST") {
        type = "ENQUIRY_LOST";
        title = "Lead Closed as LOST";
        description = meta.summary || \`Marked as LOST: \${meta.lostReason || "Unspecified"}\`;
        statusBadge = "LOST";
      } else if (log.action === "LEAD_REASSIGNED") {
        type = "LEAD_REASSIGNED";
        title = "Lead Ownership Transferred";
        description = meta.summary || \`Ownership reassigned by \${meta.actorName || "Team Member"}\`;
        statusBadge = "REASSIGNED";
      } else if (log.action === "ENQUIRY_CONVERTED_TO_TRIP") {
        type = "STAGE_CHANGED";
        title = \`Converted to Trip Workspace: \${meta.tripNumber || ""}\`;
        description = meta.summary || "Converted from enquiry to active trip.";
        statusBadge = "TRIP_WORKSPACE";
      } else if (log.action === "INTERACTION_LOGGED") {
        type = "INTERACTION_LOGGED";
        title = \`Interaction: \${meta.type || "Contact"}\`;
        description = meta.summary || "Interaction quick-logged.";
        statusBadge = meta.outcome || "INTERACTION";
      } else if (log.action === "FOLLOW_UP_SCHEDULED") {
        type = "FOLLOW_UP_SCHEDULED";
        title = \`Follow-up Scheduled: \${meta.type || "Task"}\`;
        description = meta.summary || "Follow-up scheduled.";
        statusBadge = "SCHEDULED";
      } else if (log.action === "FOLLOW_UP_COMPLETED") {
        type = "FOLLOW_UP_COMPLETED";
        title = "Follow-up Completed";
        description = meta.summary || "Follow-up task completed.";
        statusBadge = "COMPLETED";
      } else if (log.action === "FOLLOW_UP_CANCELLED") {
        type = "FOLLOW_UP_CANCELLED";
        title = "Follow-up Cancelled";
        description = meta.summary || "Follow-up task cancelled.";
        statusBadge = "CANCELLED";
      } else if (log.action === "ENQUIRY_CREATED") {
        continue;
      } else {
        title = \`\${meta.actorName || "Team Member"} updated Enquiry Details\`;
        description = meta.summary || \`\${meta.changes?.length || 1} fields updated.\`;
      }

      events.push({
        id: \`audit-\${log.id}\`,
        type,
        title,
        description,
        timestamp: log.createdAt,
        actorName: meta.actorName || undefined,
        actorRole: meta.actorRole || undefined,
        statusBadge,
        changes: meta.changes || undefined,
        metadata: meta,
      });
    }

    // Sort descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());`;

if (!content.includes('const auditLogs = await prisma.agencyAuditLog.findMany({')) {
  content = content.replace(
    '    // Sort descending by timestamp\n    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());',
    timelineAuditQueryCode
  );
}

fs.writeFileSync(targetPath, content, "utf8");
console.log("Successfully patched src/lib/services/enquiry-service.ts");

