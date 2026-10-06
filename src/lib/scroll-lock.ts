"use client";

import * as React from "react";

let activeLockCount = 0;
let originalBodyOverflow = "";
let originalHtmlOverflow = "";
let originalBodyPaddingRight = "";

/**
 * Acquires a background scroll lock.
 * Uses reference counting so nested modals do not prematurely release the lock.
 * Returns a release function that can be safely called multiple times.
 */
export function acquireScrollLock(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  activeLockCount += 1;

  if (activeLockCount === 1) {
    const doc = document;
    const body = doc.body;
    const html = doc.documentElement;

    // Snapshot original styles
    originalBodyOverflow = body.style.overflow;
    originalHtmlOverflow = html.style.overflow;
    originalBodyPaddingRight = body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    // Lock both html and body for cross-browser and mobile reliability
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    body.setAttribute("data-modal-scroll-locked", "true");
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseScrollLock();
  };
}

/**
 * Releases a single lock acquired by acquireScrollLock().
 * When all locks are released (activeLockCount === 0), restores original scroll styles.
 */
export function releaseScrollLock(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  activeLockCount = Math.max(0, activeLockCount - 1);

  if (activeLockCount === 0) {
    const doc = document;
    const body = doc.body;
    const html = doc.documentElement;

    body.style.overflow = originalBodyOverflow;
    html.style.overflow = originalHtmlOverflow;
    body.style.paddingRight = originalBodyPaddingRight;

    body.removeAttribute("data-modal-scroll-locked");
  }
}

/**
 * React hook to lock background page scroll while a modal is open.
 * Safely handles component unmounts, condition changes, and nested dialogs.
 *
 * @param isOpen Whether the modal is currently open / active
 */
export function useModalScrollLock(isOpen: boolean = true): void {
  React.useEffect(() => {
    if (!isOpen) return;

    const release = acquireScrollLock();
    return () => {
      release();
    };
  }, [isOpen]);
}
