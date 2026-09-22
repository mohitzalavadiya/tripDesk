import { z } from "zod";
import { UserNotificationType } from "@prisma/client";

export const listUserNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
  type: z.nativeEnum(UserNotificationType).optional(),
});

export type ListUserNotificationsInput = z.infer<typeof listUserNotificationsSchema>;

export const markUserNotificationReadSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required"),
});

export type MarkUserNotificationReadInput = z.infer<typeof markUserNotificationReadSchema>;
