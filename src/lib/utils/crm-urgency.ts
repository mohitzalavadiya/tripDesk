import { EnquiryFollowUp, FollowUpStatus, FollowUpType } from "@prisma/client";
import { getTodayBoundaries } from "./timezone";

export type UrgencyLevel = "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "NO_NEXT_ACTION";

/**
 * Supported inactivity threshold (in calendar days) for marking an active enquiry stale.
 * Documented in Section 5.E: Non-terminal enquiries with no meaningful activity for >= 7 days.
 */
export const STALE_THRESHOLD_DAYS = 7;

/**
 * Customer-facing follow-up types that represent qualifying direct contact with the traveler.
 * Per CRM audit mandate, FollowUpType.OTHER represents internal or unspecified tasks and does
 * not automatically reset the customer contact stale clock unless explicitly proved.
 */
export const QUALIFYING_CUSTOMER_CONTACT_TYPES: FollowUpType[] = [
  FollowUpType.CALL,
  FollowUpType.WHATSAPP,
  FollowUpType.EMAIL,
  FollowUpType.MEETING,
];

export interface PrimaryNextAction {
  id: string;
  type: FollowUpType;
  scheduledAt: Date;
  notes: string | null;
  outcome: string | null;
  priority: string;
}

export interface EnquiryUrgencyAnalysis {
  urgency: UrgencyLevel;
  urgencyLabel: string;
  badgeLabel: string;
  accessibleDescription: string;
  daysDiff: number; // Positive for overdue days, positive for upcoming days, 0 for today
  daysOverdue: number;
  daysUntil: number;
  primaryNextAction: PrimaryNextAction | null;
  totalPendingCount: number;
  overdueCount: number;
  hasMultiplePending: boolean;
  isStale: boolean;
  inactiveDays: number;
  lastActivityAt: Date;
}

/**
 * Calculates the exact cutoff timestamp in Asia/Kolkata for staleness.
 * Under India business calendar semantics, an enquiry is stale if 7 or more calendar days
 * have elapsed since the latest qualifying contact.
 *
 * If today in Asia/Kolkata is day T:
 * - A contact on day (T - 6) has 6 inactive calendar days (NOT stale).
 * - A contact on day (T - 7) has 7 inactive calendar days (STALE).
 * The cutoff dividing active from stale is midnight (00:00:00.000 IST) of day (T - 6),
 * which equals `todayBoundaries.startOfDay - (thresholdDays - 1) days`.
 * A qualifying contact must have `completedAt >= cutoff` to keep the enquiry active.
 * If there is NO qualifying contact at or after this cutoff (and enquiry.createdAt < cutoff),
 * the enquiry is STALE.
 */
export function getStaleCutoffDate(
  todayBoundaries = getTodayBoundaries("Asia/Kolkata"),
  thresholdDays: number = STALE_THRESHOLD_DAYS
): Date {
  const cutoff = new Date(todayBoundaries.startOfDay.getTime());
  cutoff.setDate(cutoff.getDate() - (thresholdDays - 1));
  return cutoff;
}

/**
 * Strips internal technical idempotency markers (e.g. `[idempotency:uuid]`) from notes.
 * Preserves user-authored notes, whitespace, and unrelated bracketed text like `[VIP]` or `[Tier 1]`.
 */
export function stripIdempotencyMarker(notes: string | null | undefined): string {
  if (!notes) return "";
  return notes
    .replace(/\s*\[idempotency:[^\]]+\]/g, "")
    .trim();
}

/**
 * Structured outcome categories for customer interactions and follow-ups.
 * Distinguishes meaningful customer contact from unsuccessful contact attempts.
 * Authoritative set approved in CRM specification:
 *
 * Meaningful-contact outcomes:
 * - CONNECTED_MEANINGFUL
 * - QUOTATION_DISCUSSED
 * - REQUIREMENTS_GATHERED
 *
 * Unsuccessful or non-meaningful outcomes (completes task, but does NOT reset stale clock):
 * - NO_ANSWER
 * - BUSY
 * - WRONG_NUMBER
 * - MESSAGE_LEFT
 */
export const STRUCTURED_CONTACT_OUTCOMES = {
  // Meaningful-contact outcomes (resets 7-day stale clock)
  CONNECTED_MEANINGFUL: "CONNECTED_MEANINGFUL", // Meaningful conversation held with traveler
  QUOTATION_DISCUSSED: "QUOTATION_DISCUSSED", // Quotation / itinerary / budget discussed
  REQUIREMENTS_GATHERED: "REQUIREMENTS_GATHERED", // Requirements / preferences collected

  // Unsuccessful or non-meaningful contact attempts (completes task, but does NOT reset stale clock)
  NO_ANSWER: "NO_ANSWER", // No answer / did not pick up
  BUSY: "BUSY", // Busy tone / disconnected
  WRONG_NUMBER: "WRONG_NUMBER", // Wrong number / invalid phone
  MESSAGE_LEFT: "MESSAGE_LEFT", // Left voicemail / message sent without confirmed response
} as const;

export type StructuredContactOutcome =
  (typeof STRUCTURED_CONTACT_OUTCOMES)[keyof typeof STRUCTURED_CONTACT_OUTCOMES];

export const QUALIFYING_STRUCTURED_OUTCOMES: string[] = [
  STRUCTURED_CONTACT_OUTCOMES.CONNECTED_MEANINGFUL,
  STRUCTURED_CONTACT_OUTCOMES.QUOTATION_DISCUSSED,
  STRUCTURED_CONTACT_OUTCOMES.REQUIREMENTS_GATHERED,
];

export const NON_QUALIFYING_STRUCTURED_OUTCOMES: string[] = [
  STRUCTURED_CONTACT_OUTCOMES.NO_ANSWER,
  STRUCTURED_CONTACT_OUTCOMES.BUSY,
  STRUCTURED_CONTACT_OUTCOMES.WRONG_NUMBER,
  STRUCTURED_CONTACT_OUTCOMES.MESSAGE_LEFT,
];

export const ALL_CANONICAL_STRUCTURED_OUTCOMES: string[] = [
  ...QUALIFYING_STRUCTURED_OUTCOMES,
  ...NON_QUALIFYING_STRUCTURED_OUTCOMES,
];

/**
 * Checks whether an outcome string is one of the canonical structured outcomes.
 */
export function isCanonicalStructuredOutcome(val: string | null | undefined): val is StructuredContactOutcome {
  if (!val) return false;
  return ALL_CANONICAL_STRUCTURED_OUTCOMES.includes(val.trim());
}

/**
 * Detects whether an outcome string is formatted as a machine-like / programmatic code identifier
 * (e.g. UPPER_SNAKE_CASE, lower_snake_case, camelCase, PascalCase, kebab-case, or single-token all-caps code)
 * rather than natural language text.
 */
export function isMachineCodePattern(str: string | null | undefined): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed) return false;

  // Direct check for canonical structured outcomes
  if (ALL_CANONICAL_STRUCTURED_OUTCOMES.includes(trimmed)) {
    return true;
  }

  // Multi-word strings with spaces are natural language unless all tokens are code-like
  if (/\s/.test(trimmed)) {
    const tokens = trimmed.split(/\s+/);
    if (tokens.length > 1 && tokens.every((t) => /^[A-Z0-9_]{2,}$/.test(t) || t.includes("_"))) {
      return true;
    }
    return false;
  }

  // Single-token strings (no spaces):
  // 1. Contains underscore (e.g. INVALID_CODE, random_status, no_answer)
  if (trimmed.includes("_")) {
    return true;
  }

  // 2. Contains kebab-case hyphen between alphanumeric characters (e.g. failed-contact, random-status)
  if (/^[a-zA-Z0-9]+-[a-zA-Z0-9-]+$/.test(trimmed)) {
    return true;
  }

  // 3. Contains camelCase or PascalCase internal capitalization (e.g. failedContact, noAnswer, unknownOutcome)
  if (/[a-z][A-Z]/.test(trimmed)) {
    return true;
  }

  // 4. All-uppercase alphanumeric code of 2+ characters (e.g. INVALID, CODE, STATUS, FAILED, NA)
  if (/^[A-Z0-9]{2,}$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Validates an outcome string on submission:
 * - Null, undefined, or empty/whitespace string: valid (outcome is optional).
 * - Matches canonical structured outcomes: valid.
 * - Matches machine-like code patterns (casing, underscores, camelCase) but NOT canonical: invalid (rejected).
 * - Natural-language free-text descriptions (e.g. "Discussed 5-star packages with client"): valid.
 */
export function isValidOutcomeFormat(val: string | null | undefined): boolean {
  if (!val || !val.trim()) return true;
  const trimmed = val.trim();
  if (isMachineCodePattern(trimmed)) {
    return ALL_CANONICAL_STRUCTURED_OUTCOMES.includes(trimmed);
  }
  return true;
}

/**
 * Explicit non-qualifying legacy free-text patterns (case-insensitive normalized matches).
 * Contact attempts that explicitly record failure to reach the customer must NOT reset the stale clock,
 * even if outcome or notes are non-empty.
 */
export const EXPLICIT_NEGATIVE_OUTCOME_PATTERNS: string[] = [
  "no answer",
  "no_answer",
  "not answered",
  "did not answer",
  "unanswered",
  "busy",
  "line busy",
  "call waiting",
  "disconnected",
  "wrong number",
  "wrong_number",
  "invalid number",
  "message left",
  "left message",
  "voicemail",
  "attempted contact",
  "attempted",
  "not reachable",
  "unreachable",
  "switched off",
  "call not picked",
  "customer not reachable",
  "customer did not pick",
];

/**
 * Checks if an outcome string represents an explicit negative/unsuccessful contact attempt.
 */
export function isExplicitNegativeOutcome(outcome: string | null | undefined): boolean {
  if (!outcome) return false;
  const normalized = outcome.trim().toLowerCase();
  if (!normalized) return false;

  // Match structured non-qualifying codes
  if (NON_QUALIFYING_STRUCTURED_OUTCOMES.some((code) => code.toLowerCase() === normalized)) {
    return true;
  }

  // Also match normalized variants of non-qualifying codes (e.g. "noanswer", "wrongnumber", "messageleft")
  const compactNormalized = normalized.replace(/[_\s-]/g, "");
  if (
    NON_QUALIFYING_STRUCTURED_OUTCOMES.some(
      (code) => code.toLowerCase().replace(/[_\s-]/g, "") === compactNormalized
    )
  ) {
    return true;
  }

  // Match legacy negative patterns (exact match, prefix match with delimiter, suffix match, or compact match)
  return EXPLICIT_NEGATIVE_OUTCOME_PATTERNS.some((pat) => {
    if (normalized === pat) return true;
    if (
      normalized.startsWith(pat + " ") ||
      normalized.startsWith(pat + "-") ||
      normalized.startsWith(pat + ":") ||
      normalized.startsWith(pat + ".")
    ) {
      return true;
    }
    if (normalized.endsWith(" " + pat)) {
      return true;
    }
    const compactPat = pat.replace(/[_\s-]/g, "");
    if (compactPat.length >= 4 && compactNormalized === compactPat) {
      return true;
    }
    return false;
  });
}

/**
 * Evaluates whether a follow-up record represents a qualifying, documented, completed customer contact.
 * Product decisions:
 * - Must be status: COMPLETED, non-archived, completedAt present and valid.
 * - Must be an explicitly customer-facing type (CALL, WHATSAPP, EMAIL, MEETING). OTHER does not qualify by default.
 * - Must have documented content (outcome or notes after stripping internal markers).
 * - Unsuccessful contact attempts (No answer, Busy, Wrong number, Message left) complete the task but do NOT qualify
 *   as meaningful customer contact and do NOT reset the stale clock.
 * - Unknown or invalid machine-like codes (e.g. INVALID_CODE, failedContact, random_status, unknownOutcome)
 *   do NOT qualify as meaningful customer contact and do NOT reset the stale clock.
 * - Meaningful canonical structured outcomes (CONNECTED_MEANINGFUL, QUOTATION_DISCUSSED, REQUIREMENTS_GATHERED) qualify.
 * - Meaningful legacy natural-language descriptions qualify.
 * - Internal reminders, uncompleted tasks, cancelled tasks, or undocumented tasks do NOT qualify.
 */
export function isQualifyingCustomerContact(f: EnquiryFollowUp): boolean {
  if (!f || f.status !== FollowUpStatus.COMPLETED || f.archivedAt) {
    return false;
  }
  if (!f.completedAt) {
    return false;
  }
  const completedDate = new Date(f.completedAt);
  if (isNaN(completedDate.getTime())) {
    return false;
  }
  if (!QUALIFYING_CUSTOMER_CONTACT_TYPES.includes(f.type)) {
    return false;
  }

  // If the outcome is explicitly negative (No answer, Busy, Wrong number, Message left, etc.),
  // it is an unsuccessful contact attempt. It completes the scheduled task, but strictly
  // DOES NOT qualify as meaningful customer contact and DOES NOT reset the stale clock.
  if (isExplicitNegativeOutcome(f.outcome)) {
    return false;
  }

  const cleanNotes = stripIdempotencyMarker(f.notes);

  // If outcome is absent but notes explicitly indicate failure to reach the customer, disqualify
  if (!f.outcome && isExplicitNegativeOutcome(cleanNotes)) {
    return false;
  }

  // Evaluate whether outcome represents a qualifying contact:
  // 1. If absent/whitespace: not a qualifying outcome.
  // 2. If it is a machine-like code: only canonical qualifying codes qualify;
  //    unknown or non-qualifying machine codes (INVALID_CODE, failedContact, random_status, unknownOutcome, etc.)
  //    strictly do NOT qualify.
  // 3. If natural-language text: qualifies if non-negative.
  let hasQualifyingOutcome = false;
  if (f.outcome && f.outcome.trim().length > 0) {
    const trimmedOutcome = f.outcome.trim();
    if (isMachineCodePattern(trimmedOutcome)) {
      hasQualifyingOutcome = QUALIFYING_STRUCTURED_OUTCOMES.includes(trimmedOutcome);
    } else {
      hasQualifyingOutcome = true;
    }
  }

  // Evaluate whether notes represent qualifying contact:
  // Must be non-empty, not an explicit negative outcome, and not an unknown machine code
  let hasQualifyingNotes = false;
  if (cleanNotes && cleanNotes.length > 0) {
    if (!isExplicitNegativeOutcome(cleanNotes)) {
      if (isMachineCodePattern(cleanNotes)) {
        hasQualifyingNotes = QUALIFYING_STRUCTURED_OUTCOMES.includes(cleanNotes);
      } else {
        hasQualifyingNotes = true;
      }
    }
  }

  return hasQualifyingOutcome || hasQualifyingNotes;
}

/**
 * Derives authoritative follow-up urgency, primary next action, and staleness
 * for an enquiry adhering strictly to Section 5 product rules:
 *
 * 1. Overdue: Incomplete follow-up whose due date/time is prior to start of today.
 * 2. Due today: Incomplete follow-up falling within today's calendar boundaries (IST: UTC+05:30).
 * 3. Upcoming: Incomplete follow-up beyond today's calendar boundary.
 * 4. No next action: Enquiry with zero incomplete follow-ups.
 * 5. Primary Next Action Selection:
 *    - Never hides an overdue task merely because another task is upcoming.
 *    - Prefers the earliest actionable due item (sorted by scheduledAt ASC).
 *    - Preserves count of multiple overdue tasks.
 * 6. Staleness:
 *    - Independent of task urgency (an enquiry can have an overdue task and still be stale).
 *    - Based on elapsed time since the latest meaningful customer contact (completed & documented).
 *    - Clerical edits (updatedAt) and future task creation do NOT reset staleness.
 *    - Evaluated at threshold of 7 days without siloing or concealing data.
 */
export function classifyEnquiryUrgency(
  enquiry: {
    id: string;
    status: string;
    updatedAt: Date | string;
    createdAt: Date | string;
    nextFollowUpAt?: Date | string | null;
    followUps?: Array<EnquiryFollowUp>;
  },
  todayBoundaries = getTodayBoundaries("Asia/Kolkata")
): EnquiryUrgencyAnalysis {
  const followUps = enquiry.followUps || [];
  
  // 1. Identify all active, incomplete (PENDING) follow-ups
  const pendingFollowUps = followUps
    .filter((f) => f.status === FollowUpStatus.PENDING && !f.archivedAt)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const totalPendingCount = pendingFollowUps.length;
  const hasMultiplePending = totalPendingCount > 1;

  // 2. Identify overdue vs today vs upcoming
  const overdueTasks = pendingFollowUps.filter(
    (f) => new Date(f.scheduledAt).getTime() < todayBoundaries.start.getTime()
  );
  const todayTasks = pendingFollowUps.filter(
    (f) =>
      new Date(f.scheduledAt).getTime() >= todayBoundaries.start.getTime() &&
      new Date(f.scheduledAt).getTime() <= todayBoundaries.end.getTime()
  );
  const upcomingTasks = pendingFollowUps.filter(
    (f) => new Date(f.scheduledAt).getTime() > todayBoundaries.end.getTime()
  );

  const overdueCount = overdueTasks.length;

  let urgency: UrgencyLevel = "NO_NEXT_ACTION";
  let urgencyLabel = "No next action";
  let accessibleDescription = "No pending follow-up scheduled";
  let daysDiff = 0;
  let primaryTask: PrimaryNextAction | null = null;

  if (overdueTasks.length > 0) {
    // Earliest overdue task is authoritative primary next action
    const task = overdueTasks[0];
    const taskDate = new Date(task.scheduledAt);
    daysDiff = Math.max(
      1,
      Math.floor((todayBoundaries.start.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    urgency = "OVERDUE";
    urgencyLabel = daysDiff === 1 ? "Overdue 1 day" : `Overdue ${daysDiff} days`;
    accessibleDescription = `Overdue by ${daysDiff} day${daysDiff === 1 ? "" : "s"}. ${task.type} was due on ${taskDate.toLocaleDateString("en-IN")}`;
    primaryTask = {
      id: task.id,
      type: task.type,
      scheduledAt: taskDate,
      notes: task.notes ? stripIdempotencyMarker(task.notes) : null,
      outcome: task.outcome,
      priority: task.priority,
    };
  } else if (todayTasks.length > 0) {
    const task = todayTasks[0];
    const taskDate = new Date(task.scheduledAt);
    urgency = "DUE_TODAY";
    urgencyLabel = "Due today";
    accessibleDescription = `Follow-up due today. ${task.type} scheduled for ${taskDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
    daysDiff = 0;
    primaryTask = {
      id: task.id,
      type: task.type,
      scheduledAt: taskDate,
      notes: task.notes ? stripIdempotencyMarker(task.notes) : null,
      outcome: task.outcome,
      priority: task.priority,
    };
  } else if (upcomingTasks.length > 0) {
    const task = upcomingTasks[0];
    const taskDate = new Date(task.scheduledAt);
    daysDiff = Math.max(
      1,
      Math.ceil((taskDate.getTime() - todayBoundaries.end.getTime()) / (1000 * 60 * 60 * 24))
    );
    urgency = "UPCOMING";
    const dateFormatted = taskDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    urgencyLabel = `Upcoming • ${dateFormatted}`;
    accessibleDescription = `Upcoming follow-up due on ${taskDate.toLocaleDateString("en-IN")}${daysDiff > 0 ? ` (in ${daysDiff} days)` : ""}`;
    primaryTask = {
      id: task.id,
      type: task.type,
      scheduledAt: taskDate,
      notes: task.notes ? stripIdempotencyMarker(task.notes) : null,
      outcome: task.outcome,
      priority: task.priority,
    };
  } else {
    // If followUps relation was not loaded (undefined), evaluate parent nextFollowUpAt if present.
    // If followUps was provided as an array, the follow-up records are authoritative.
    if (!Array.isArray(enquiry.followUps) && enquiry.nextFollowUpAt) {
      const parentDate = new Date(enquiry.nextFollowUpAt);
      if (!isNaN(parentDate.getTime())) {
        if (parentDate.getTime() < todayBoundaries.start.getTime()) {
          daysDiff = Math.max(
            1,
            Math.floor((todayBoundaries.start.getTime() - parentDate.getTime()) / (1000 * 60 * 60 * 24))
          );
          urgency = "OVERDUE";
          urgencyLabel = daysDiff === 1 ? "Overdue 1 day" : `Overdue ${daysDiff} days`;
          accessibleDescription = `Overdue by ${daysDiff} day${daysDiff === 1 ? "" : "s"}`;
        } else if (
          parentDate.getTime() >= todayBoundaries.start.getTime() &&
          parentDate.getTime() <= todayBoundaries.end.getTime()
        ) {
          urgency = "DUE_TODAY";
          urgencyLabel = "Due today";
          accessibleDescription = "Follow-up due today";
        } else {
          daysDiff = Math.max(
            1,
            Math.ceil((parentDate.getTime() - todayBoundaries.end.getTime()) / (1000 * 60 * 60 * 24))
          );
          urgency = "UPCOMING";
          const parentFormatted = parentDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
          urgencyLabel = `Upcoming • ${parentFormatted}`;
          accessibleDescription = `Upcoming follow-up due on ${parentFormatted}`;
        }
      }
    }
  }

  // 3. Calculate Staleness (last meaningful customer contact)
  // Baseline is enquiry creation timestamp. Routine edits (updatedAt) and future task creation do NOT reset staleness.
  let latestActivityTime = new Date(enquiry.createdAt).getTime();
  if (isNaN(latestActivityTime)) {
    latestActivityTime = Date.now();
  }

  // Check qualifying completed, documented customer-facing contacts
  for (const f of followUps) {
    if (isQualifyingCustomerContact(f)) {
      const contactTime = new Date(f.completedAt!).getTime();
      if (!isNaN(contactTime) && contactTime > latestActivityTime) {
        latestActivityTime = contactTime;
      }
    }
  }

  const lastActivityAt = new Date(latestActivityTime);
  const latestActivityDayStart = getTodayBoundaries("Asia/Kolkata", lastActivityAt).startOfDay;
  const inactiveDays = Math.max(
    0,
    Math.round((todayBoundaries.startOfDay.getTime() - latestActivityDayStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Staleness applies to active (non-terminal) leads inactive for 7 or more calendar days
  const isTerminalStage =
    enquiry.status === "CONVERTED" || enquiry.status === "LOST" || enquiry.status === "CANCELLED";
  const isStale = !isTerminalStage && inactiveDays >= STALE_THRESHOLD_DAYS;

  const daysOverdue = urgency === "OVERDUE" ? daysDiff : 0;
  const daysUntil = urgency === "UPCOMING" ? daysDiff : 0;
  const badgeLabel = urgencyLabel;

  return {
    urgency,
    urgencyLabel,
    badgeLabel,
    accessibleDescription,
    daysDiff,
    daysOverdue,
    daysUntil,
    primaryNextAction: primaryTask,
    totalPendingCount,
    overdueCount,
    hasMultiplePending,
    isStale,
    inactiveDays,
    lastActivityAt,
  };
}
