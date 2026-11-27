import { ItineraryItem } from "@prisma/client";

export interface VirtualDayGroup {
  dayNumber: number;
  date: Date;
  items: ItineraryItem[];
  isBeyondDuration: boolean;
}

export type AutosaveStatus =
  | "idle"
  | "unsaved"
  | "saving"
  | "saved"
  | "error"
  | "conflict";
