import { NotFoundError,ValidationError } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
CreateItineraryTemplateInput,
PackageTemplateContent,
parseTemplateContent,
TemplateListQuery,
UpdateItineraryTemplateInput,
} from "@/lib/validation/itinerary-template-schema";
import { ItineraryTemplate,ItineraryTemplateType } from "@prisma/client";
import "server-only";

export type ItineraryTemplateWithDestination = ItineraryTemplate & {
  destination?: {
    id: string;
    name: string;
    state: string | null;
    country: string;
  } | null;
};

export const itineraryTemplateService = {
  /**
   * Retrieves all itinerary templates scoped strictly to the authenticated agency.
   */
  async listTemplates(
    agencyId: string,
    query: TemplateListQuery = {}
  ): Promise<ItineraryTemplateWithDestination[]> {
    return prisma.itineraryTemplate.findMany({
      where: {
        agencyId,
        ...(query.type ? { type: query.type } : {}),
        ...(query.destinationId ? { destinationId: query.destinationId } : {}),
        isArchived: query.includeArchived ? undefined : false,
        ...(query.search
          ? {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    });
  },

  /**
   * Retrieves a single template by ID, verifying agency ownership.
   */
  async getTemplateById(
    agencyId: string,
    templateId: string
  ): Promise<ItineraryTemplateWithDestination | null> {
    return prisma.itineraryTemplate.findFirst({
      where: {
        id: templateId,
        agencyId,
      },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
          },
        },
      },
    });
  },

  /**
   * Creates a new reusable itinerary template after validating agency tenancy
   * and ensuring destination ownership matches the authenticated agency.
   */
  async createTemplate(
    agencyId: string,
    data: CreateItineraryTemplateInput
  ): Promise<ItineraryTemplateWithDestination> {
    // 1. Verify destination ownership if provided
    if (data.destinationId) {
      const destination = await prisma.destination.findFirst({
        where: {
          id: data.destinationId,
          agencyId,
        },
        select: { id: true },
      });

      if (!destination) {
        throw new ValidationError(
          "The specified destination was not found or does not belong to your agency."
        );
      }
    }

    // 2. Derive dayCount accurately
    let dayCount = 1;
    if (data.type === ItineraryTemplateType.PACKAGE) {
      const content = data.content as any;
      dayCount = content?.totalDays || data.dayCount || 1;
    }

    return prisma.itineraryTemplate.create({
      data: {
        agencyId,
        destinationId: data.destinationId || null,
        type: data.type,
        name: data.name,
        description: data.description || null,
        dayCount,
        content: data.content as any,
        isArchived: false,
      },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
          },
        },
      },
    });
  },

  /**
   * Updates an existing itinerary template under the authenticated agency.
   */
  async updateTemplate(
    agencyId: string,
    templateId: string,
    data: UpdateItineraryTemplateInput
  ): Promise<ItineraryTemplateWithDestination> {
    const existing = await prisma.itineraryTemplate.findFirst({
      where: {
        id: templateId,
        agencyId,
      },
      select: { id: true, type: true },
    });

    if (!existing) {
      throw new NotFoundError("Itinerary template");
    }

    // Verify destination ownership if changing
    if (data.destinationId !== undefined && data.destinationId !== null && data.destinationId !== "") {
      const destination = await prisma.destination.findFirst({
        where: {
          id: data.destinationId,
          agencyId,
        },
        select: { id: true },
      });

      if (!destination) {
        throw new ValidationError(
          "The specified destination was not found or does not belong to your agency."
        );
      }
    }

    let dayCount = data.dayCount;
    let validatedContent: unknown = undefined;

    if (data.content !== undefined) {
      // F-04: Enforce strict content validation using the persisted template type
      const parsed = parseTemplateContent(existing.type, data.content);
      if (!parsed.success) {
        throw new ValidationError(
          `Invalid ${existing.type} template content: ${parsed.error.issues.map((i) => i.message).join(", ")}`
        );
      }
      validatedContent = parsed.data;
      if (existing.type === ItineraryTemplateType.PACKAGE) {
        dayCount = (parsed.data as PackageTemplateContent).totalDays;
      }
    }

    return prisma.itineraryTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.destinationId !== undefined
          ? { destinationId: data.destinationId || null }
          : {}),
        ...(dayCount !== undefined ? { dayCount } : {}),
        ...(validatedContent !== undefined ? { content: validatedContent as any } : {}),
        ...(data.isArchived !== undefined ? { isArchived: data.isArchived } : {}),
      },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
          },
        },
      },
    });
  },

  /**
   * Soft-archives a template, removing it from active pickers while preserving audit history.
   */
  async archiveTemplate(
    agencyId: string,
    templateId: string
  ): Promise<ItineraryTemplateWithDestination> {
    const existing = await prisma.itineraryTemplate.findFirst({
      where: {
        id: templateId,
        agencyId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Itinerary template");
    }

    return prisma.itineraryTemplate.update({
      where: { id: templateId },
      data: { isArchived: true },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            state: true,
            country: true,
          },
        },
      },
    });
  },
};
