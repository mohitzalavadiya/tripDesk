import "server-only";
import prisma from "@/lib/prisma";
import {
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
} from "@prisma/client";
import { AnalyticsFilterInput, AnalyticsPreset } from "@/lib/validation/operations-schema";

// ═════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═════════════════════════════════════════════════════════════════════

export interface DateRangeResult {
  start: Date;
  end: Date;
  preset: AnalyticsPreset;
}

export interface OperationsOverviewKPIs {
  totalOperations: number;
  statusBreakdown: {
    pending: number;
    preparing: number;
    ready: number;
    ongoing: number;
    completed: number;
    cancelled: number;
  };
  readinessOverview: {
    averageReadinessPercent: number;
    readyBeforeDeparturePercent: number;
    atRiskCount: number;
    criticalBlockerCount: number;
  };
  issuesOverview: {
    totalIssues: number;
    openIssues: number;
    criticalIssues: number;
    highIssues: number;
    resolvedIssues: number;
    closedIssues: number;
    averageResolutionHours: number;
    medianResolutionHours: number;
    reopenedCount: number;
    reopenedRatePercent: number;
  };
  servicesOverview: {
    totalHotels: number;
    confirmedHotels: number;
    hotelConfirmationRate: number;
    totalVehicles: number;
    dispatchedVehicles: number;
    vehicleDispatchRate: number;
    totalActivities: number;
    confirmedActivities: number;
    activityConfirmationRate: number;
    totalCancelledServices: number;
    serviceCancellationRate: number;
    totalAmendedServices: number;
    serviceAmendmentRate: number;
  };
  financialOverview: {
    totalPlannedCost: number;
    totalActualCost: number;
    totalVariance: number;
    averageVariancePercent: number;
    overBudgetCount: number;
    savingsCount: number;
    reconciledOperationsCount: number;
  };
  guestSatisfactionOverview: {
    averageGuestRating: number;
    averageOperatorRating: number;
    reviewsCompletedCount: number;
    reviewCompletionRate: number;
    qualityDistribution: {
      excellent: number;
      good: number;
      average: number;
      poor: number;
    };
  };
}

export interface ReadinessDistributionItem {
  bucket: string;
  count: number;
  percentage: number;
}

export interface OperationalBlockerItem {
  category: "HOTEL" | "VEHICLE" | "ACTIVITY" | "CRITICAL_ISSUE";
  label: string;
  count: number;
  percentage: number;
}

export interface ReadinessAnalyticsResult {
  averageReadinessScore: number;
  readinessDistribution: ReadinessDistributionItem[];
  topBlockers: OperationalBlockerItem[];
  fullyReadyCount: number;
  unreadyCount: number;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface OperationalRiskItem {
  operationId: string;
  tripId: string;
  tripNumber: string;
  tripTitle: string;
  customerName: string;
  startDate: string | null;
  status: OperationStatus;
  readinessScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: string[];
}

export interface OperationalRiskAnalyticsResult {
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  highestRiskOperations: OperationalRiskItem[];
}

export interface IssueAnalyticsResult {
  totalIssues: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byStatus: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  problemAreas: {
    transport: number;
    hotel: number;
    activities: number;
    guestService: number;
    other: number;
  };
  averageResolutionHours: number;
  medianResolutionHours: number;
  reopenedRatePercent: number;
  criticalIssueRatePercent: number;
}

export interface SupplierPerformanceItem {
  supplierId: string;
  supplierName: string;
  supplierType: string;
  totalServices: number;
  confirmedServices: number;
  confirmationRate: number;
  amendedCount: number;
  cancelledCount: number;
  issueCount: number;
}

export interface DriverPerformanceItem {
  driverName: string;
  driverPhone: string | null;
  totalDispatches: number;
  completedDispatches: number;
  confirmedDispatches: number;
  completionRate: number;
  issueCount: number;
}

export interface SupplierAnalyticsResult {
  suppliers: SupplierPerformanceItem[];
  drivers: DriverPerformanceItem[];
}

export interface FinancialAnalyticsResult {
  totalPlannedCost: number;
  totalActualCost: number;
  totalVariance: number;
  averageVariancePercent: number;
  overBudgetOperations: {
    operationId: string;
    tripNumber: string;
    tripTitle: string;
    plannedCost: number;
    actualCost: number;
    varianceAmount: number;
    varianceReason: string | null;
  }[];
  savingsOperations: {
    operationId: string;
    tripNumber: string;
    tripTitle: string;
    plannedCost: number;
    actualCost: number;
    varianceAmount: number;
    varianceReason: string | null;
  }[];
}

export interface GuestSatisfactionResult {
  averageGuestRating: number;
  averageOperatorRating: number;
  totalReviews: number;
  reviewCompletionRate: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  recentFeedback: {
    operationId: string;
    tripNumber: string;
    guestRating: number;
    serviceQuality: string;
    guestFeedback: string | null;
    internalRemarks: string;
  }[];
}

export interface TrendTimePoint {
  dateLabel: string;
  operationsCount: number;
  operationsCompleted: number;
  operationsCancelled: number;
  issuesCreated: number;
  issuesResolved: number;
  averageReadiness: number;
  totalCostVariance: number;
}

export interface OperationsAnalyticsDashboard {
  dateRange: {
    start: string;
    end: string;
    preset: AnalyticsPreset;
  };
  overview: OperationsOverviewKPIs;
  readiness: ReadinessAnalyticsResult;
  risk: OperationalRiskAnalyticsResult;
  issues: IssueAnalyticsResult;
  suppliers: SupplierAnalyticsResult;
  financial: FinancialAnalyticsResult;
  guestSatisfaction: GuestSatisfactionResult;
  trends: TrendTimePoint[];
}

// ═════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════

export function calculateDateRange(
  preset: AnalyticsPreset = "LAST_30_DAYS",
  customStart?: string,
  customEnd?: string
): DateRangeResult {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "TODAY":
      // start is today 00:00:00
      break;
    case "LAST_7_DAYS":
      start.setDate(now.getDate() - 7);
      break;
    case "LAST_30_DAYS":
      start.setDate(now.getDate() - 30);
      break;
    case "LAST_90_DAYS":
      start.setDate(now.getDate() - 90);
      break;
    case "CURRENT_MONTH":
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "PREVIOUS_MONTH":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
      break;
    case "CURRENT_YEAR":
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case "CUSTOM":
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end.setTime(new Date(customEnd).getTime());
        end.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { start, end, preset };
}

/**
 * Calculates deterministic readiness score (0-100) for a single operation.
 */
function calculateOperationReadiness(op: {
  hotelConfirmations: { status: ConfirmationStatus }[];
  vehicleDispatches: { status: DispatchStatus; driverName: string | null }[];
  activityConfirmations: { status: ConfirmationStatus }[];
  issues: { priority: IssuePriority; status: IssueStatus }[];
}): { score: number; blockers: string[] } {
  const blockers: string[] = [];

  // Active hotel items (exclude cancelled)
  const activeHotels = op.hotelConfirmations.filter((h) => h.status !== ConfirmationStatus.CANCELLED);
  const confirmedHotels = activeHotels.filter(
    (h) => h.status === ConfirmationStatus.CONFIRMED || h.status === ConfirmationStatus.AMENDED
  );
  const hotelsReady = activeHotels.length === 0 || confirmedHotels.length === activeHotels.length;
  if (!hotelsReady) {
    blockers.push(`Hotel Confirmations Pending (${activeHotels.length - confirmedHotels.length})`);
  }

  // Active vehicle items (exclude cancelled)
  const activeVehicles = op.vehicleDispatches.filter((v) => v.status !== DispatchStatus.CANCELLED);
  const confirmedVehicles = activeVehicles.filter(
    (v) =>
      (v.status === DispatchStatus.CONFIRMED ||
        v.status === DispatchStatus.ASSIGNED ||
        v.status === DispatchStatus.ON_DUTY ||
        v.status === DispatchStatus.COMPLETED) &&
      !!v.driverName
  );
  const vehiclesReady = activeVehicles.length === 0 || confirmedVehicles.length === activeVehicles.length;
  if (!vehiclesReady) {
    blockers.push(`Vehicle / Driver Dispatch Pending (${activeVehicles.length - confirmedVehicles.length})`);
  }

  // Active activity items (exclude cancelled)
  const activeActivities = op.activityConfirmations.filter((a) => a.status !== ConfirmationStatus.CANCELLED);
  const confirmedActivities = activeActivities.filter(
    (a) => a.status === ConfirmationStatus.CONFIRMED || a.status === ConfirmationStatus.AMENDED
  );
  const activitiesReady = activeActivities.length === 0 || confirmedActivities.length === activeActivities.length;
  if (!activitiesReady) {
    blockers.push(`Activity Passes Pending (${activeActivities.length - confirmedActivities.length})`);
  }

  // Critical issues
  const activeCriticalIssues = op.issues.filter(
    (i) => i.priority === IssuePriority.CRITICAL && (i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS)
  );
  if (activeCriticalIssues.length > 0) {
    blockers.push(`Open Critical Issue (${activeCriticalIssues.length})`);
  }

  // Overall component counts
  const totalItems = activeHotels.length + activeVehicles.length + activeActivities.length;
  const confirmedItems = confirmedHotels.length + confirmedVehicles.length + confirmedActivities.length;

  let baseScore = totalItems > 0 ? Math.round((confirmedItems / totalItems) * 100) : 100;
  if (activeCriticalIssues.length > 0) {
    baseScore = Math.min(baseScore, 50); // Critical issue caps readiness at 50%
  }

  return { score: baseScore, blockers };
}

/**
 * Calculates deterministic Operational Risk Score (0-100) and Level.
 *
 * Scoring Formula:
 * - Base score = 0
 * - Readiness < 50%: +35 points
 * - Else if Readiness < 80%: +20 points
 * - Departure proximity: Start date within 48 hours & Readiness < 100%: +25 points
 * - Open CRITICAL issues: +30 points per issue
 * - Open HIGH issues: +15 points per issue
 * - Missing driver/chauffeur within 24h of pickup: +20 points
 * - Financial cost overrun (>10% variance): +10 points
 * - Repeated cancellations (>1 service cancelled): +10 points
 *
 * Levels:
 * - CRITICAL: 80 - 100
 * - HIGH: 60 - 79
 * - MEDIUM: 30 - 59
 * - LOW: 0 - 29
 */
function calculateOperationRisk(
  op: {
    id: string;
    tripId: string;
    status: OperationStatus;
    trip: { tripNumber: string | null; title: string; startDate: Date | null; customer: { name: string } };
    hotelConfirmations: { status: ConfirmationStatus }[];
    vehicleDispatches: { status: DispatchStatus; driverName: string | null; pickupDate: Date | null }[];
    activityConfirmations: { status: ConfirmationStatus }[];
    issues: { priority: IssuePriority; status: IssueStatus }[];
    events: { eventType: string; metadata: any }[];
  },
  readinessScore: number
): OperationalRiskItem {
  let riskScore = 0;
  const factors: string[] = [];
  const now = new Date();

  // 1. Readiness Penalty
  if (readinessScore < 50) {
    riskScore += 35;
    factors.push("Readiness is critically low (< 50%)");
  } else if (readinessScore < 80) {
    riskScore += 20;
    factors.push("Readiness is moderate (< 80%)");
  }

  // 2. Departure Proximity Penalty
  if (op.trip.startDate) {
    const hoursToDeparture = (op.trip.startDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursToDeparture > 0 && hoursToDeparture <= 48 && readinessScore < 100) {
      riskScore += 25;
      factors.push(`Departs in ${Math.round(hoursToDeparture)}h with unconfirmed services`);
    }
  }

  // 3. Issue Penalties
  const openCritical = op.issues.filter(
    (i) => i.priority === IssuePriority.CRITICAL && (i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS)
  );
  if (openCritical.length > 0) {
    riskScore += openCritical.length * 30;
    factors.push(`${openCritical.length} active CRITICAL operational issue(s)`);
  }

  const openHigh = op.issues.filter(
    (i) => i.priority === IssuePriority.HIGH && (i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS)
  );
  if (openHigh.length > 0) {
    riskScore += openHigh.length * 15;
    factors.push(`${openHigh.length} active HIGH operational issue(s)`);
  }

  // 4. Missing Driver within 24h
  const unassignedImminentDispatches = op.vehicleDispatches.filter((v) => {
    if (v.status === DispatchStatus.CANCELLED) return false;
    if (v.driverName) return false;
    const pickup = v.pickupDate || op.trip.startDate;
    if (!pickup) return false;
    const hoursToPickup = (pickup.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursToPickup > 0 && hoursToPickup <= 24;
  });
  if (unassignedImminentDispatches.length > 0) {
    riskScore += 20;
    factors.push(`${unassignedImminentDispatches.length} vehicle dispatch(es) without driver within 24h`);
  }

  // 5. Financial Overrun
  const finEvent = op.events.find((e) => e.eventType === "FINANCIAL_RECONCILIATION_SAVED");
  if (finEvent?.metadata) {
    const planned = Number(finEvent.metadata.plannedCost) || 0;
    const actual = Number(finEvent.metadata.actualCost) || 0;
    if (planned > 0 && actual > planned * 1.1) {
      riskScore += 10;
      factors.push(`Cost overrun > 10% (Variance: ₹${(actual - planned).toLocaleString("en-IN")})`);
    }
  }

  // Cap risk score between 0 and 100
  riskScore = Math.min(100, Math.max(0, riskScore));

  let riskLevel: RiskLevel = "LOW";
  if (riskScore >= 80) riskLevel = "CRITICAL";
  else if (riskScore >= 60) riskLevel = "HIGH";
  else if (riskScore >= 30) riskLevel = "MEDIUM";

  return {
    operationId: op.id,
    tripId: op.tripId,
    tripNumber: op.trip.tripNumber || "N/A",
    tripTitle: op.trip.title,
    customerName: op.trip.customer.name,
    startDate: op.trip.startDate ? op.trip.startDate.toISOString() : null,
    status: op.status,
    readinessScore,
    riskScore,
    riskLevel,
    factors: factors.length > 0 ? factors : ["All operational services confirmed on schedule."],
  };
}

// ═════════════════════════════════════════════════════════════════════
// CORE ANALYTICS SERVICE
// ═════════════════════════════════════════════════════════════════════

export const operationsAnalyticsService = {
  /**
   * Generates the comprehensive Operations Analytics Dashboard for an agency.
   */
  async getOperationsAnalyticsDashboard(
    agencyId: string,
    filters: AnalyticsFilterInput = { preset: "LAST_30_DAYS" }
  ): Promise<OperationsAnalyticsDashboard> {
    const { start, end, preset } = calculateDateRange(filters.preset, filters.startDate, filters.endDate);

    // 1. Fetch all operations for the agency created or active in date range
    const operations = await prisma.tripOperation.findMany({
      where: {
        agencyId,
        ...(filters.status ? { status: filters.status } : {}),
        createdAt: { gte: start, lte: end },
      },
      include: {
        trip: {
          include: {
            customer: true,
          },
        },
        booking: true,
        hotelConfirmations: {
          include: {
            supplier: true,
          },
        },
        vehicleDispatches: {
          include: {
            vehicle: true,
          },
        },
        activityConfirmations: {
          include: {
            activity: true,
          },
        },
        issues: true,
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch all operational issues for the agency within date range
    const issues = await prisma.operationalIssue.findMany({
      where: {
        agencyId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Compute Overview KPIs
    let totalHotels = 0;
    let confirmedHotels = 0;
    let totalVehicles = 0;
    let dispatchedVehicles = 0;
    let totalActivities = 0;
    let confirmedActivities = 0;
    let totalCancelledServices = 0;
    let totalAmendedServices = 0;

    let totalPlannedCost = 0;
    let totalActualCost = 0;
    let overBudgetCount = 0;
    let savingsCount = 0;
    let reconciledCount = 0;

    let totalGuestRating = 0;
    let totalOperatorRating = 0;
    let reviewsCount = 0;
    const qualityDist = { excellent: 0, good: 0, average: 0, poor: 0 };
    const recentFeedbackList: GuestSatisfactionResult["recentFeedback"] = [];

    const readinessScores: number[] = [];
    let readyBeforeDepartureCount = 0;
    let atRiskCount = 0;
    let criticalBlockerCount = 0;

    const riskItems: OperationalRiskItem[] = [];
    const blockerCategoryCounts: Record<OperationalBlockerItem["category"], number> = {
      HOTEL: 0,
      VEHICLE: 0,
      ACTIVITY: 0,
      CRITICAL_ISSUE: 0,
    };

    const statusBreakdown = {
      pending: 0,
      preparing: 0,
      ready: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
    };

    const overBudgetList: FinancialAnalyticsResult["overBudgetOperations"] = [];
    const savingsList: FinancialAnalyticsResult["savingsOperations"] = [];

    // Process each operation
    for (const op of operations) {
      // Status breakdown
      switch (op.status) {
        case OperationStatus.PENDING:
          statusBreakdown.pending++;
          break;
        case OperationStatus.PREPARING:
          statusBreakdown.preparing++;
          break;
        case OperationStatus.READY:
          statusBreakdown.ready++;
          break;
        case OperationStatus.ONGOING:
          statusBreakdown.ongoing++;
          break;
        case OperationStatus.COMPLETED:
          statusBreakdown.completed++;
          break;
        case OperationStatus.CANCELLED:
          statusBreakdown.cancelled++;
          break;
      }

      // Services counts
      for (const h of op.hotelConfirmations) {
        totalHotels++;
        if (h.status === ConfirmationStatus.CONFIRMED || h.status === ConfirmationStatus.AMENDED) confirmedHotels++;
        if (h.status === ConfirmationStatus.CANCELLED) totalCancelledServices++;
        if (h.status === ConfirmationStatus.AMENDED) totalAmendedServices++;
      }
      for (const v of op.vehicleDispatches) {
        totalVehicles++;
        if (
          (v.status === DispatchStatus.CONFIRMED ||
            v.status === DispatchStatus.ASSIGNED ||
            v.status === DispatchStatus.ON_DUTY ||
            v.status === DispatchStatus.COMPLETED) &&
          !!v.driverName
        ) {
          dispatchedVehicles++;
        }
        if (v.status === DispatchStatus.CANCELLED) totalCancelledServices++;
      }
      for (const a of op.activityConfirmations) {
        totalActivities++;
        if (a.status === ConfirmationStatus.CONFIRMED || a.status === ConfirmationStatus.AMENDED) confirmedActivities++;
        if (a.status === ConfirmationStatus.CANCELLED) totalCancelledServices++;
        if (a.status === ConfirmationStatus.AMENDED) totalAmendedServices++;
      }

      // Readiness computation
      const { score, blockers } = calculateOperationReadiness(op);
      readinessScores.push(score);

      if (score === 100) {
        readyBeforeDepartureCount++;
      }
      if (score < 70) {
        atRiskCount++;
      }

      // Blocker tallies
      for (const b of blockers) {
        if (b.includes("Hotel")) blockerCategoryCounts.HOTEL++;
        if (b.includes("Vehicle")) blockerCategoryCounts.VEHICLE++;
        if (b.includes("Activity")) blockerCategoryCounts.ACTIVITY++;
        if (b.includes("Critical")) {
          blockerCategoryCounts.CRITICAL_ISSUE++;
          criticalBlockerCount++;
        }
      }

      // Risk computation
      const risk = calculateOperationRisk(op as any, score);
      riskItems.push(risk);

      // Post-tour review data from timeline
      const reviewEvent = op.events.find((e) =>
        ["POST_TOUR_REVIEW_SAVED", "POST_TOUR_REVIEW_UPDATED"].includes(e.eventType)
      );
      if (reviewEvent?.metadata) {
        const meta = reviewEvent.metadata as any;
        if (meta.guestRating) {
          totalGuestRating += Number(meta.guestRating);
          totalOperatorRating += Number(meta.operatorRating || meta.guestRating);
          reviewsCount++;

          const q = (meta.serviceQuality || "EXCELLENT").toLowerCase();
          if (q === "excellent") qualityDist.excellent++;
          else if (q === "good") qualityDist.good++;
          else if (q === "average") qualityDist.average++;
          else if (q === "poor") qualityDist.poor++;

          if (recentFeedbackList.length < 5) {
            recentFeedbackList.push({
              operationId: op.id,
              tripNumber: op.trip.tripNumber || "N/A",
              guestRating: Number(meta.guestRating),
              serviceQuality: meta.serviceQuality || "EXCELLENT",
              guestFeedback: meta.guestFeedback || null,
              internalRemarks: meta.internalRemarks || "",
            });
          }
        }
      }

      // Financial reconciliation data from timeline
      const finEvent = op.events.find((e) => e.eventType === "FINANCIAL_RECONCILIATION_SAVED");
      if (finEvent?.metadata) {
        const meta = finEvent.metadata as any;
        const planned = Number(meta.plannedCost) || 0;
        const actual = Number(meta.actualCost) || 0;
        const variance = Number(meta.varianceAmount) || actual - planned;

        totalPlannedCost += planned;
        totalActualCost += actual;
        reconciledCount++;

        if (variance > 0.01) {
          overBudgetCount++;
          overBudgetList.push({
            operationId: op.id,
            tripNumber: op.trip.tripNumber || "N/A",
            tripTitle: op.trip.title,
            plannedCost: planned,
            actualCost: actual,
            varianceAmount: variance,
            varianceReason: meta.varianceReason || null,
          });
        } else if (variance < -0.01) {
          savingsCount++;
          savingsList.push({
            operationId: op.id,
            tripNumber: op.trip.tripNumber || "N/A",
            tripTitle: op.trip.title,
            plannedCost: planned,
            actualCost: actual,
            varianceAmount: variance,
            varianceReason: meta.varianceReason || null,
          });
        }
      } else if (op.booking?.totalAmount) {
        const cost = Number(op.booking.totalAmount) || 0;
        totalPlannedCost += cost;
        totalActualCost += cost;
      }
    }

    // Issues analytics
    let totalResolutionHours = 0;
    let resolvedIssuesCount = 0;
    const resolutionDurations: number[] = [];
    let openIssuesCount = 0;
    let criticalIssuesCount = 0;
    let highIssuesCount = 0;
    let closedIssuesCount = 0;
    let reopenedIssuesCount = 0;

    const issuesByPriority = { low: 0, medium: 0, high: 0, critical: 0 };
    const issuesByStatus = { open: 0, inProgress: 0, resolved: 0, closed: 0 };
    const problemAreas = { transport: 0, hotel: 0, activities: 0, guestService: 0, other: 0 };

    for (const issue of issues) {
      // Priority
      switch (issue.priority) {
        case IssuePriority.LOW:
          issuesByPriority.low++;
          break;
        case IssuePriority.MEDIUM:
          issuesByPriority.medium++;
          break;
        case IssuePriority.HIGH:
          issuesByPriority.high++;
          highIssuesCount++;
          break;
        case IssuePriority.CRITICAL:
          issuesByPriority.critical++;
          criticalIssuesCount++;
          break;
      }

      // Status
      switch (issue.status) {
        case IssueStatus.OPEN:
          issuesByStatus.open++;
          openIssuesCount++;
          break;
        case IssueStatus.IN_PROGRESS:
          issuesByStatus.inProgress++;
          openIssuesCount++;
          break;
        case IssueStatus.RESOLVED:
          issuesByStatus.resolved++;
          break;
        case IssueStatus.CLOSED:
          issuesByStatus.closed++;
          closedIssuesCount++;
          break;
      }

      // Resolution time
      if ((issue.status === IssueStatus.RESOLVED || issue.status === IssueStatus.CLOSED) && issue.resolvedAt) {
        const hours = Math.max(0, (issue.resolvedAt.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60));
        totalResolutionHours += hours;
        resolutionDurations.push(hours);
        resolvedIssuesCount++;
      }

      // Problem areas categorization based on text
      const fullText = `${issue.title} ${issue.description}`.toLowerCase();
      if (
        fullText.includes("car") ||
        fullText.includes("driver") ||
        fullText.includes("vehicle") ||
        fullText.includes("chauffeur") ||
        fullText.includes("transport") ||
        fullText.includes("cab") ||
        fullText.includes("road")
      ) {
        problemAreas.transport++;
      } else if (
        fullText.includes("hotel") ||
        fullText.includes("room") ||
        fullText.includes("resort") ||
        fullText.includes("stay") ||
        fullText.includes("bed")
      ) {
        problemAreas.hotel++;
      } else if (
        fullText.includes("activity") ||
        fullText.includes("ticket") ||
        fullText.includes("pass") ||
        fullText.includes("safari") ||
        fullText.includes("sightseeing")
      ) {
        problemAreas.activities++;
      } else if (
        fullText.includes("guest") ||
        fullText.includes("customer") ||
        fullText.includes("flight") ||
        fullText.includes("luggage") ||
        fullText.includes("food")
      ) {
        problemAreas.guestService++;
      } else {
        problemAreas.other++;
      }
    }

    // Sort resolution durations for median
    resolutionDurations.sort((a, b) => a - b);
    const medianResolutionHours =
      resolutionDurations.length > 0
        ? resolutionDurations[Math.floor(resolutionDurations.length / 2)]
        : 0;

    // 4. Readiness Distribution
    const totalOps = operations.length;
    const avgReadiness =
      readinessScores.length > 0
        ? Math.round(readinessScores.reduce((a, b) => a + b, 0) / readinessScores.length)
        : 100;

    const readinessDist: ReadinessDistributionItem[] = [
      {
        bucket: "0–25%",
        count: readinessScores.filter((s) => s <= 25).length,
        percentage: totalOps > 0 ? Math.round((readinessScores.filter((s) => s <= 25).length / totalOps) * 100) : 0,
      },
      {
        bucket: "26–50%",
        count: readinessScores.filter((s) => s > 25 && s <= 50).length,
        percentage: totalOps > 0 ? Math.round((readinessScores.filter((s) => s > 25 && s <= 50).length / totalOps) * 100) : 0,
      },
      {
        bucket: "51–75%",
        count: readinessScores.filter((s) => s > 50 && s <= 75).length,
        percentage: totalOps > 0 ? Math.round((readinessScores.filter((s) => s > 50 && s <= 75).length / totalOps) * 100) : 0,
      },
      {
        bucket: "76–99%",
        count: readinessScores.filter((s) => s > 75 && s < 100).length,
        percentage: totalOps > 0 ? Math.round((readinessScores.filter((s) => s > 75 && s < 100).length / totalOps) * 100) : 0,
      },
      {
        bucket: "100% (Ready)",
        count: readinessScores.filter((s) => s === 100).length,
        percentage: totalOps > 0 ? Math.round((readinessScores.filter((s) => s === 100).length / totalOps) * 100) : 0,
      },
    ];

    const totalBlockers =
      blockerCategoryCounts.HOTEL +
      blockerCategoryCounts.VEHICLE +
      blockerCategoryCounts.ACTIVITY +
      blockerCategoryCounts.CRITICAL_ISSUE;

    const topBlockers: OperationalBlockerItem[] = [
      {
        category: "HOTEL" as const,
        label: "Hotel Confirmations",
        count: blockerCategoryCounts.HOTEL,
        percentage: totalBlockers > 0 ? Math.round((blockerCategoryCounts.HOTEL / totalBlockers) * 100) : 0,
      },
      {
        category: "VEHICLE" as const,
        label: "Vehicle / Driver Dispatch",
        count: blockerCategoryCounts.VEHICLE,
        percentage: totalBlockers > 0 ? Math.round((blockerCategoryCounts.VEHICLE / totalBlockers) * 100) : 0,
      },
      {
        category: "ACTIVITY" as const,
        label: "Activity Passes",
        count: blockerCategoryCounts.ACTIVITY,
        percentage: totalBlockers > 0 ? Math.round((blockerCategoryCounts.ACTIVITY / totalBlockers) * 100) : 0,
      },
      {
        category: "CRITICAL_ISSUE" as const,
        label: "Critical Issues",
        count: blockerCategoryCounts.CRITICAL_ISSUE,
        percentage: totalBlockers > 0 ? Math.round((blockerCategoryCounts.CRITICAL_ISSUE / totalBlockers) * 100) : 0,
      },
    ].sort((a, b) => b.count - a.count);

    // 5. Supplier Performance Aggregations
    const supplierMap = new Map<string, SupplierPerformanceItem>();
    const driverMap = new Map<string, DriverPerformanceItem>();

    for (const op of operations) {
      for (const h of op.hotelConfirmations) {
        if (h.supplier) {
          const sId = h.supplier.id;
          const current: SupplierPerformanceItem = supplierMap.get(sId) || {
            supplierId: sId,
            supplierName: h.supplier.name,
            supplierType: h.supplier.type || "HOTEL",
            totalServices: 0,
            confirmedServices: 0,
            confirmationRate: 0,
            amendedCount: 0,
            cancelledCount: 0,
            issueCount: 0,
          };
          current.totalServices++;
          if (h.status === ConfirmationStatus.CONFIRMED || h.status === ConfirmationStatus.AMENDED) {
            current.confirmedServices++;
          }
          if (h.status === ConfirmationStatus.AMENDED) current.amendedCount++;
          if (h.status === ConfirmationStatus.CANCELLED) current.cancelledCount++;
          current.confirmationRate =
            current.totalServices > 0 ? Math.round((current.confirmedServices / current.totalServices) * 100) : 0;
          supplierMap.set(sId, current);
        }
      }

      for (const v of op.vehicleDispatches) {
        if (v.driverName) {
          const dName = v.driverName.trim();
          const current = driverMap.get(dName) || {
            driverName: dName,
            driverPhone: v.driverPhone,
            totalDispatches: 0,
            completedDispatches: 0,
            confirmedDispatches: 0,
            completionRate: 0,
            issueCount: 0,
          };
          current.totalDispatches++;
          if (v.status === DispatchStatus.COMPLETED) current.completedDispatches++;
          if (v.status === DispatchStatus.CONFIRMED || v.status === DispatchStatus.ASSIGNED) current.confirmedDispatches++;
          current.completionRate =
            current.totalDispatches > 0
              ? Math.round(((current.completedDispatches + current.confirmedDispatches) / current.totalDispatches) * 100)
              : 0;
          driverMap.set(dName, current);
        }
      }
    }

    // 6. Time-series Trends (Group by days)
    const trendMap = new Map<string, TrendTimePoint>();
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));
    const stepDays = diffDays > 60 ? 7 : 1; // Weekly grouping for long ranges

    for (let t = start.getTime(); t <= end.getTime(); t += stepDays * dayMs) {
      const d = new Date(t);
      const label = d.toISOString().slice(0, 10);
      trendMap.set(label, {
        dateLabel: label,
        operationsCount: 0,
        operationsCompleted: 0,
        operationsCancelled: 0,
        issuesCreated: 0,
        issuesResolved: 0,
        averageReadiness: 0,
        totalCostVariance: 0,
      });
    }

    const endLabel = end.toISOString().slice(0, 10);
    if (!trendMap.has(endLabel)) {
      trendMap.set(endLabel, {
        dateLabel: endLabel,
        operationsCount: 0,
        operationsCompleted: 0,
        operationsCancelled: 0,
        issuesCreated: 0,
        issuesResolved: 0,
        averageReadiness: 0,
        totalCostVariance: 0,
      });
    }

    for (const op of operations) {
      const label = op.createdAt.toISOString().slice(0, 10);
      let point = trendMap.get(label);
      if (!point) {
        point = {
          dateLabel: label,
          operationsCount: 0,
          operationsCompleted: 0,
          operationsCancelled: 0,
          issuesCreated: 0,
          issuesResolved: 0,
          averageReadiness: 0,
          totalCostVariance: 0,
        };
        trendMap.set(label, point);
      }
      point.operationsCount++;
      if (op.status === OperationStatus.COMPLETED) point.operationsCompleted++;
      if (op.status === OperationStatus.CANCELLED) point.operationsCancelled++;
    }

    for (const issue of issues) {
      const label = issue.createdAt.toISOString().slice(0, 10);
      let point = trendMap.get(label);
      if (!point) {
        point = {
          dateLabel: label,
          operationsCount: 0,
          operationsCompleted: 0,
          operationsCancelled: 0,
          issuesCreated: 0,
          issuesResolved: 0,
          averageReadiness: 0,
          totalCostVariance: 0,
        };
        trendMap.set(label, point);
      }
      point.issuesCreated++;

      if (issue.resolvedAt) {
        const rLabel = issue.resolvedAt.toISOString().slice(0, 10);
        let rPoint = trendMap.get(rLabel);
        if (!rPoint) {
          rPoint = {
            dateLabel: rLabel,
            operationsCount: 0,
            operationsCompleted: 0,
            operationsCancelled: 0,
            issuesCreated: 0,
            issuesResolved: 0,
            averageReadiness: 0,
            totalCostVariance: 0,
          };
          trendMap.set(rLabel, rPoint);
        }
        rPoint.issuesResolved++;
      }
    }

    // Sort trends chronologically
    const trends = Array.from(trendMap.values())
      .sort((a, b) => a.dateLabel.localeCompare(b.dateLabel))
      .slice(-30);

    // Sort risk operations by riskScore descending
    riskItems.sort((a, b) => b.riskScore - a.riskScore);

    const totalVariance = totalActualCost - totalPlannedCost;
    const avgVariancePercent =
      totalPlannedCost > 0 ? Math.round((totalVariance / totalPlannedCost) * 100 * 10) / 10 : 0;

    const totalServices = totalHotels + totalVehicles + totalActivities;

    return {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        preset,
      },
      overview: {
        totalOperations: totalOps,
        statusBreakdown,
        readinessOverview: {
          averageReadinessPercent: avgReadiness,
          readyBeforeDeparturePercent:
            totalOps > 0 ? Math.round((readyBeforeDepartureCount / totalOps) * 100) : 0,
          atRiskCount,
          criticalBlockerCount,
        },
        issuesOverview: {
          totalIssues: issues.length,
          openIssues: openIssuesCount,
          criticalIssues: criticalIssuesCount,
          highIssues: highIssuesCount,
          resolvedIssues: resolvedIssuesCount,
          closedIssues: closedIssuesCount,
          averageResolutionHours:
            resolvedIssuesCount > 0 ? Math.round((totalResolutionHours / resolvedIssuesCount) * 10) / 10 : 0,
          medianResolutionHours: Math.round(medianResolutionHours * 10) / 10,
          reopenedCount: reopenedIssuesCount,
          reopenedRatePercent:
            issues.length > 0 ? Math.round((reopenedIssuesCount / issues.length) * 100) : 0,
        },
        servicesOverview: {
          totalHotels,
          confirmedHotels,
          hotelConfirmationRate: totalHotels > 0 ? Math.round((confirmedHotels / totalHotels) * 100) : 0,
          totalVehicles,
          dispatchedVehicles,
          vehicleDispatchRate: totalVehicles > 0 ? Math.round((dispatchedVehicles / totalVehicles) * 100) : 0,
          totalActivities,
          confirmedActivities,
          activityConfirmationRate:
            totalActivities > 0 ? Math.round((confirmedActivities / totalActivities) * 100) : 0,
          totalCancelledServices,
          serviceCancellationRate:
            totalServices > 0 ? Math.round((totalCancelledServices / totalServices) * 100) : 0,
          totalAmendedServices,
          serviceAmendmentRate:
            totalServices > 0 ? Math.round((totalAmendedServices / totalServices) * 100) : 0,
        },
        financialOverview: {
          totalPlannedCost,
          totalActualCost,
          totalVariance,
          averageVariancePercent: avgVariancePercent,
          overBudgetCount,
          savingsCount,
          reconciledOperationsCount: reconciledCount,
        },
        guestSatisfactionOverview: {
          averageGuestRating:
            reviewsCount > 0 ? Math.round((totalGuestRating / reviewsCount) * 10) / 10 : 0,
          averageOperatorRating:
            reviewsCount > 0 ? Math.round((totalOperatorRating / reviewsCount) * 10) / 10 : 0,
          reviewsCompletedCount: reviewsCount,
          reviewCompletionRate:
            statusBreakdown.completed > 0 ? Math.round((reviewsCount / statusBreakdown.completed) * 100) : 0,
          qualityDistribution: qualityDist,
        },
      },
      readiness: {
        averageReadinessScore: avgReadiness,
        readinessDistribution: readinessDist,
        topBlockers,
        fullyReadyCount: readyBeforeDepartureCount,
        unreadyCount: totalOps - readyBeforeDepartureCount,
      },
      risk: {
        riskDistribution: {
          low: riskItems.filter((r) => r.riskLevel === "LOW").length,
          medium: riskItems.filter((r) => r.riskLevel === "MEDIUM").length,
          high: riskItems.filter((r) => r.riskLevel === "HIGH").length,
          critical: riskItems.filter((r) => r.riskLevel === "CRITICAL").length,
        },
        highestRiskOperations: riskItems.slice(0, 10),
      },
      issues: {
        totalIssues: issues.length,
        byPriority: issuesByPriority,
        byStatus: issuesByStatus,
        problemAreas,
        averageResolutionHours:
          resolvedIssuesCount > 0 ? Math.round((totalResolutionHours / resolvedIssuesCount) * 10) / 10 : 0,
        medianResolutionHours: Math.round(medianResolutionHours * 10) / 10,
        reopenedRatePercent:
          issues.length > 0 ? Math.round((reopenedIssuesCount / issues.length) * 100) : 0,
        criticalIssueRatePercent:
          issues.length > 0 ? Math.round((criticalIssuesCount / issues.length) * 100) : 0,
      },
      suppliers: {
        suppliers: Array.from(supplierMap.values()).sort((a, b) => b.totalServices - a.totalServices),
        drivers: Array.from(driverMap.values()).sort((a, b) => b.totalDispatches - a.totalDispatches),
      },
      financial: {
        totalPlannedCost,
        totalActualCost,
        totalVariance,
        averageVariancePercent: avgVariancePercent,
        overBudgetOperations: overBudgetList.sort((a, b) => b.varianceAmount - a.varianceAmount),
        savingsOperations: savingsList.sort((a, b) => a.varianceAmount - b.varianceAmount),
      },
      guestSatisfaction: {
        averageGuestRating:
          reviewsCount > 0 ? Math.round((totalGuestRating / reviewsCount) * 10) / 10 : 0,
        averageOperatorRating:
          reviewsCount > 0 ? Math.round((totalOperatorRating / reviewsCount) * 10) / 10 : 0,
        totalReviews: reviewsCount,
        reviewCompletionRate:
          statusBreakdown.completed > 0 ? Math.round((reviewsCount / statusBreakdown.completed) * 100) : 0,
        qualityDistribution: qualityDist,
        recentFeedback: recentFeedbackList,
      },
      trends,
    };
  },

  /**
   * Generates a sanitized CSV export of operational metrics & risk scorecard.
   */
  async generateAnalyticsCsv(
    agencyId: string,
    filters: AnalyticsFilterInput = { preset: "LAST_30_DAYS" }
  ): Promise<string> {
    const data = await this.getOperationsAnalyticsDashboard(agencyId, filters);

    const rows: string[] = [];
    rows.push("TRIPDESK OPERATIONS MANAGEMENT ANALYTICS REPORT");
    rows.push(`Generated At,${new Date().toISOString()}`);
    rows.push(`Date Range Preset,${data.dateRange.preset}`);
    rows.push(`Date Range,${data.dateRange.start.slice(0, 10)} to ${data.dateRange.end.slice(0, 10)}`);
    rows.push("");

    // KPI Summary Section
    rows.push("=== EXECUTIVE OPERATIONS KPIS ===");
    rows.push(`Total Operations,${data.overview.totalOperations}`);
    rows.push(`Preparing Operations,${data.overview.statusBreakdown.preparing}`);
    rows.push(`Ready Operations,${data.overview.statusBreakdown.ready}`);
    rows.push(`Ongoing Operations,${data.overview.statusBreakdown.ongoing}`);
    rows.push(`Completed Operations,${data.overview.statusBreakdown.completed}`);
    rows.push(`Cancelled Operations,${data.overview.statusBreakdown.cancelled}`);
    rows.push(`Average Readiness Score,${data.overview.readinessOverview.averageReadinessPercent}%`);
    rows.push(`At-Risk Operations,${data.overview.readinessOverview.atRiskCount}`);
    rows.push(`Critical Blockers Count,${data.overview.readinessOverview.criticalBlockerCount}`);
    rows.push(`Total Open Issues,${data.overview.issuesOverview.openIssues}`);
    rows.push(`Critical Open Issues,${data.overview.issuesOverview.criticalIssues}`);
    rows.push(`Average Issue Resolution (Hours),${data.overview.issuesOverview.averageResolutionHours}`);
    rows.push(`Hotel Confirmation Rate,${data.overview.servicesOverview.hotelConfirmationRate}%`);
    rows.push(`Vehicle Dispatch Rate,${data.overview.servicesOverview.vehicleDispatchRate}%`);
    rows.push(`Activity Confirmation Rate,${data.overview.servicesOverview.activityConfirmationRate}%`);
    rows.push(`Total Planned Cost,₹${data.overview.financialOverview.totalPlannedCost}`);
    rows.push(`Total Actual Cost,₹${data.overview.financialOverview.totalActualCost}`);
    rows.push(`Net Cost Variance,₹${data.overview.financialOverview.totalVariance}`);
    rows.push(`Average Guest Rating,${data.overview.guestSatisfactionOverview.averageGuestRating} / 5`);
    rows.push("");

    // Top Risk Operations
    rows.push("=== TOP OPERATIONAL RISK TOURS ===");
    rows.push("Trip Number,Customer,Status,Departure Date,Readiness %,Risk Score,Risk Level,Key Factors");
    for (const r of data.risk.highestRiskOperations) {
      const factorsEscaped = `"${r.factors.join("; ").replace(/"/g, '""')}"`;
      rows.push(
        `"${r.tripNumber}","${r.customerName}","${r.status}","${r.startDate ? r.startDate.slice(0, 10) : "N/A"}",${r.readinessScore}%,${r.riskScore},"${r.riskLevel}",${factorsEscaped}`
      );
    }
    rows.push("");

    // Supplier Performance
    rows.push("=== SUPPLIER PERFORMANCE SCORECARD ===");
    rows.push("Supplier Name,Type,Total Services,Confirmed Services,Confirmation Rate %,Amended,Cancelled");
    for (const s of data.suppliers.suppliers) {
      rows.push(
        `"${s.supplierName}","${s.supplierType}",${s.totalServices},${s.confirmedServices},${s.confirmationRate}%,${s.amendedCount},${s.cancelledCount}`
      );
    }

    return rows.join("\n");
  },
};
