import { itineraryClient } from "@/lib/api-client";
import { ItineraryItem } from "@prisma/client";
import * as React from "react";
import { AutosaveStatus } from "./types";

interface UseItineraryAutosaveProps {
  tripId: string;
  item: ItineraryItem;
  onSaved?: (updatedItem: ItineraryItem) => void;
}

export function useItineraryAutosave({
  tripId,
  item,
  onSaved,
}: UseItineraryAutosaveProps) {
  const [draft, setDraft] = React.useState({
    title: item.title,
    description: item.description || "",
    location: item.location || "",
    startTime: item.startTime || "",
    endTime: item.endTime || "",
  });

  const [status, setStatus] = React.useState<AutosaveStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = React.useRef(false);
  const pendingDraftRef = React.useRef<typeof draft | null>(null);
  const sequenceRef = React.useRef(0);
  const serverUpdatedAtRef = React.useRef<Date>(new Date(item.updatedAt));
  const latestDraftRef = React.useRef(draft);
  latestDraftRef.current = draft;

  const storageKey = React.useMemo(
    () => `tripdesk_draft_itin_${tripId}_${item.id}`,
    [tripId, item.id]
  );

  // Check sessionStorage for unsaved local draft on mount
  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only consider if draft is from within 2 hours
        if (Date.now() - (parsed.savedAt || 0) < 2 * 60 * 60 * 1000) {
          if (parsed.data && parsed.data.title) {
            setDraft((prev) => ({
              ...prev,
              ...parsed.data,
            }));
            setStatus("unsaved");
          }
        } else {
          sessionStorage.removeItem(storageKey);
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, [storageKey]);

  // Synchronize if server item updatedAt advances externally
  React.useEffect(() => {
    serverUpdatedAtRef.current = new Date(item.updatedAt);
  }, [item.updatedAt]);

  const executeSave = React.useCallback(
    async (payloadToSave: typeof draft) => {
      if (inFlightRef.current) {
        pendingDraftRef.current = payloadToSave;
        return;
      }

      inFlightRef.current = true;
      setStatus("saving");
      setErrorMessage(null);
      const currentSeq = ++sequenceRef.current;

      try {
        const res = await itineraryClient.updateItineraryItem(tripId, item.id, {
          title: payloadToSave.title.trim(),
          description: payloadToSave.description.trim() || null,
          location: payloadToSave.location.trim() || null,
          startTime: payloadToSave.startTime.trim() || null,
          endTime: payloadToSave.endTime.trim() || null,
          expectedUpdatedAt: serverUpdatedAtRef.current,
        });

        // Only apply if this request is the latest
        if (currentSeq === sequenceRef.current) {
          serverUpdatedAtRef.current = new Date(res.data.updatedAt);

          // Clear sessionStorage draft only if current user draft matches what was saved
          const isLatestSaved =
            latestDraftRef.current.title === payloadToSave.title &&
            latestDraftRef.current.description === payloadToSave.description &&
            latestDraftRef.current.location === payloadToSave.location &&
            latestDraftRef.current.startTime === payloadToSave.startTime &&
            latestDraftRef.current.endTime === payloadToSave.endTime;

          if (isLatestSaved) {
            sessionStorage.removeItem(storageKey);
            setStatus("saved");
            setTimeout(() => {
              setStatus((current) => (current === "saved" ? "idle" : current));
            }, 2500);
          }

          if (onSaved) {
            onSaved(res.data);
          }
        }
      } catch (err: any) {
        if (currentSeq === sequenceRef.current) {
          if (err?.statusCode === 409 || err?.code === "CONFLICT") {
            setStatus("conflict");
            setErrorMessage(
              err?.message ||
                "Item was updated in another session. Your local edits are preserved."
            );
          } else {
            setStatus("error");
            setErrorMessage(err?.message || "Failed to autosave changes.");
          }
        }
      } finally {
        inFlightRef.current = false;
        // If user made edits while save was in-flight, immediately dispatch next save
        if (pendingDraftRef.current) {
          const nextPayload = pendingDraftRef.current;
          pendingDraftRef.current = null;
          executeSave(nextPayload);
        }
      }
    },
    [tripId, item.id, storageKey, onSaved]
  );

  const updateField = React.useCallback(
    (field: keyof typeof draft, value: string) => {
      setDraft((prev) => {
        const next = { ...prev, [field]: value };
        latestDraftRef.current = next;

        // Persist draft to sessionStorage
        try {
          sessionStorage.setItem(
            storageKey,
            JSON.stringify({
              data: next,
              savedAt: Date.now(),
            })
          );
        } catch {
          // Ignore storage quota or permission errors
        }

        setStatus("unsaved");

        // Clear previous debounce timer
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        // Set 800ms debounce
        debounceTimerRef.current = setTimeout(() => {
          executeSave(next);
        }, 800);

        return next;
      });
    },
    [storageKey, executeSave]
  );

  // Unmount cleanup to cancel any pending debounce timer
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const flushSave = React.useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (status === "unsaved" || status === "error") {
      executeSave(latestDraftRef.current);
    }
  }, [status, executeSave]);

  const reloadFromServer = React.useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const currentSeq = ++sequenceRef.current;
    setStatus("saving");
    setErrorMessage(null);

    try {
      const res = await itineraryClient.getItineraryItem(tripId, item.id);
      if (currentSeq === sequenceRef.current && res?.data) {
        const fresh = res.data;
        const freshDraft = {
          title: fresh.title,
          description: fresh.description || "",
          location: fresh.location || "",
          startTime: fresh.startTime || "",
          endTime: fresh.endTime || "",
        };
        setDraft(freshDraft);
        latestDraftRef.current = freshDraft;
        serverUpdatedAtRef.current = new Date(fresh.updatedAt);
        sessionStorage.removeItem(storageKey);
        setStatus("idle");
        setErrorMessage(null);
        if (onSaved) {
          onSaved(fresh);
        }
      }
    } catch (err: any) {
      if (currentSeq === sequenceRef.current) {
        setStatus("error");
        setErrorMessage(err?.message || "Failed to reload item from server.");
      }
    }
  }, [tripId, item.id, storageKey, onSaved]);

  const overwriteSave = React.useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const currentSeq = ++sequenceRef.current;
    setStatus("saving");
    setErrorMessage(null);

    try {
      // Step 1: Obtain fresh authoritative server token
      const freshRes = await itineraryClient.getItineraryItem(tripId, item.id);
      if (currentSeq !== sequenceRef.current) return;

      if (!freshRes?.data) {
        throw new Error("Unable to obtain fresh server token for overwrite.");
      }

      const freshToken = new Date(freshRes.data.updatedAt);
      const payloadToSave = latestDraftRef.current;

      // Step 2: Submit local retained draft with fresh token
      const res = await itineraryClient.updateItineraryItem(tripId, item.id, {
        title: payloadToSave.title.trim(),
        description: payloadToSave.description.trim() || null,
        location: payloadToSave.location.trim() || null,
        startTime: payloadToSave.startTime.trim() || null,
        endTime: payloadToSave.endTime.trim() || null,
        expectedUpdatedAt: freshToken,
      });

      if (currentSeq === sequenceRef.current) {
        serverUpdatedAtRef.current = new Date(res.data.updatedAt);
        sessionStorage.removeItem(storageKey);
        setStatus("saved");
        setTimeout(() => {
          setStatus((current) => (current === "saved" ? "idle" : current));
        }, 2500);

        if (onSaved) {
          onSaved(res.data);
        }
      }
    } catch (err: any) {
      if (currentSeq === sequenceRef.current) {
        if (err?.statusCode === 409 || err?.code === "CONFLICT") {
          setStatus("conflict");
          setErrorMessage(
            err?.message ||
              "Item was updated again in another session. Local edits preserved."
          );
        } else {
          setStatus("error");
          setErrorMessage(err?.message || "Failed to overwrite item.");
        }
      }
    }
  }, [tripId, item.id, storageKey, onSaved]);

  const retrySave = React.useCallback(() => {
    if (status === "conflict") {
      overwriteSave();
    } else {
      flushSave();
    }
  }, [status, overwriteSave, flushSave]);

  return {
    draft,
    status,
    errorMessage,
    updateField,
    flushSave,
    retrySave,
    overwriteSave,
    reloadFromServer,
  };
}
