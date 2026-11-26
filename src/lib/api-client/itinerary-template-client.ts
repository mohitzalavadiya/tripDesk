import {
CreateItineraryTemplateInput,
TemplateListQuery,
UpdateItineraryTemplateInput,
} from "@/lib/validation/itinerary-template-schema";
import { ItineraryTemplate } from "@prisma/client";
import { ApiClientError,SingleResponse } from "./customer-client";

export type ItineraryTemplateWithDestination = ItineraryTemplate & {
  destination?: {
    id: string;
    name: string;
    state: string | null;
    country: string;
  } | null;
};

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(
      json.error?.message || "An unexpected error occurred."
    ) as ApiClientError;
    error.code =
      json.error?.code ||
      (res.status === 401
        ? "UNAUTHORIZED"
        : res.status === 403
        ? "FORBIDDEN"
        : "API_ERROR");
    error.statusCode = res.status;
    error.details = json.error?.details;
    throw error;
  }

  return json;
}

export const itineraryTemplateClient = {
  /**
   * Lists all reusable itinerary templates for the authenticated agency.
   */
  async getTemplates(
    query: TemplateListQuery = {}
  ): Promise<SingleResponse<ItineraryTemplateWithDestination[]>> {
    const params = new URLSearchParams();
    if (query.type) params.set("type", query.type);
    if (query.destinationId) params.set("destinationId", query.destinationId);
    if (query.includeArchived) params.set("includeArchived", "true");
    if (query.search) params.set("search", query.search);

    const qs = params.toString();
    const url = `/api/itinerary-templates${qs ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<ItineraryTemplateWithDestination[]>>(res);
  },

  /**
   * Retrieves a single itinerary template by ID.
   */
  async getTemplate(
    templateId: string
  ): Promise<SingleResponse<ItineraryTemplateWithDestination>> {
    const res = await fetch(
      `/api/itinerary-templates/${encodeURIComponent(templateId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<ItineraryTemplateWithDestination>>(res);
  },

  /**
   * Creates a new Day or Package template.
   */
  async createTemplate(
    data: CreateItineraryTemplateInput
  ): Promise<SingleResponse<ItineraryTemplateWithDestination>> {
    const res = await fetch(`/api/itinerary-templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<ItineraryTemplateWithDestination>>(res);
  },

  /**
   * Updates an existing template.
   */
  async updateTemplate(
    templateId: string,
    data: UpdateItineraryTemplateInput
  ): Promise<SingleResponse<ItineraryTemplateWithDestination>> {
    const res = await fetch(
      `/api/itinerary-templates/${encodeURIComponent(templateId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<ItineraryTemplateWithDestination>>(res);
  },

  /**
   * Soft-archives a template.
   */
  async archiveTemplate(
    templateId: string
  ): Promise<SingleResponse<{ message: string; template: ItineraryTemplateWithDestination }>> {
    const res = await fetch(
      `/api/itinerary-templates/${encodeURIComponent(templateId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<
      SingleResponse<{ message: string; template: ItineraryTemplateWithDestination }>
    >(res);
  },
};
