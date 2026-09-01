import {
  DashboardExecutiveSummary,
  SalesFunnelAnalytics,
  RevenueAndProfitAnalytics,
  RevenueTimeSeriesPoint,
  AccountsReceivableAnalytics,
  SupplierPayableAnalytics,
  UpcomingDepartureItem,
  CRMAndFollowUpAnalytics,
  TopDestinationItem,
  TopCustomerItem,
  DashboardSalesKPIs,
  DashboardFinancialKPIs,
  DashboardOperationsKPIs,
  DashboardCRMKPIs,
  DashboardCommunicationKPIs,
  DashboardDocumentReadinessKPIs,
} from "@/lib/services/dashboard-service";
import { DashboardFilterInput } from "@/lib/validation/dashboard-schema";

export interface DashboardApiResponse {
  summary: DashboardExecutiveSummary;
  funnel: SalesFunnelAnalytics;
  revenueTrend: RevenueAndProfitAnalytics;
  destinations: TopDestinationItem[];
  customers: TopCustomerItem[];
}

export interface DashboardSalesApiResponse {
  funnel: SalesFunnelAnalytics;
  salesKPIs: DashboardSalesKPIs;
  topDestinations: TopDestinationItem[];
}

export interface DashboardFinanceApiResponse {
  financialKPIs: DashboardFinancialKPIs;
  revenueTrend: RevenueTimeSeriesPoint[];
  profitability: {
    totalRevenue: number;
    totalCollected: number;
    totalSupplierCost: number;
    totalGrossProfit: number;
    overallMarginPercent: number;
  };
  receivables: AccountsReceivableAnalytics;
  payables: SupplierPayableAnalytics;
}

export interface DashboardOperationsApiResponse {
  operationsKPIs: DashboardOperationsKPIs;
  documentKPIs: DashboardDocumentReadinessKPIs;
  upcomingDepartures: UpcomingDepartureItem[];
}

export interface DashboardCRMApiResponse {
  crmKPIs: DashboardCRMKPIs;
  communicationKPIs: DashboardCommunicationKPIs;
  followUps: CRMAndFollowUpAnalytics;
  topCustomers: TopCustomerItem[];
}

export class DashboardClient {
  private baseUrl = "/api/dashboard";

  private buildQueryString(filter?: DashboardFilterInput): string {
    if (!filter) return "";
    const params = new URLSearchParams();
    if (filter.preset) params.set("preset", filter.preset);
    if (filter.startDate) params.set("startDate", filter.startDate);
    if (filter.endDate) params.set("endDate", filter.endDate);
    if (filter.refresh) params.set("refresh", filter.refresh);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  /**
   * Consolidated Executive Summary & Overview
   */
  async getSummary(filter?: DashboardFilterInput): Promise<DashboardApiResponse> {
    const res = await fetch(`${this.baseUrl}/summary${this.buildQueryString(filter)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch executive dashboard metrics.");
    }

    return json.data;
  }

  /**
   * Sales Funnel & Pipeline Analytics
   */
  async getSales(filter?: DashboardFilterInput): Promise<DashboardSalesApiResponse> {
    const res = await fetch(`${this.baseUrl}/sales${this.buildQueryString(filter)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch sales analytics.");
    }

    return json.data;
  }

  /**
   * Finance, Receivables & Profitability
   */
  async getFinance(filter?: DashboardFilterInput): Promise<DashboardFinanceApiResponse> {
    const res = await fetch(`${this.baseUrl}/finance${this.buildQueryString(filter)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch financial analytics.");
    }

    return json.data;
  }

  /**
   * Operations & Upcoming Departures
   */
  async getOperations(limit = 15): Promise<DashboardOperationsApiResponse> {
    const res = await fetch(`${this.baseUrl}/operations?limit=${limit}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch operations analytics.");
    }

    return json.data;
  }

  /**
   * CRM & Communications Health
   */
  async getCRM(filter?: DashboardFilterInput): Promise<DashboardCRMApiResponse> {
    const res = await fetch(`${this.baseUrl}/crm${this.buildQueryString(filter)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to fetch CRM analytics.");
    }

    return json.data;
  }

  /**
   * Export Dashboard CSV URL
   */
  getExportUrl(filter?: DashboardFilterInput): string {
    return `${this.baseUrl}/export${this.buildQueryString(filter)}`;
  }
}

export const dashboardClient = new DashboardClient();
