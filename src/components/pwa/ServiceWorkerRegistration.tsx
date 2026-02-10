"use client";

import { useEffect, useCallback } from "react";
import { useUpdateStore } from "@/stores/update-store";

/**
 * Registers the service worker and detects updates.
 * When a new SW version is found, it notifies the update store
 * which shows a banner prompting the user to refresh.
 */
export default function ServiceWorkerRegistration() {
  const { setUpdateAvailable, setRegistration } = useUpdateStore();

  const handleSWUpdate = useCallback(
    (registration: ServiceWorkerRegistration) => {
      setRegistration(registration);
      setUpdateAvailable(true);
    },
    [setRegistration, setUpdateAvailable]
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    // When a new SW takes control, reload the page once
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Listen for messages from the SW
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "SW_UPDATED") {
        // SW activated a new version — clean stale localStorage
        cleanStaleData(event.data.version);
      }
    });

    // Register the SW
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        setRegistration(registration);

        // If there's already a waiting SW, show update prompt
        if (registration.waiting) {
          handleSWUpdate(registration);
          return;
        }

        // Listen for new SW installing
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            // New SW is installed and waiting
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              handleSWUpdate(registration);
            }
          });
        });

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update().catch(() => {
            // Network error, ignore
          });
        }, 60 * 1000);
      })
      .catch((err) => {
        console.log("SW registration failed:", err);
      });
  }, [handleSWUpdate, setRegistration]);

  return null;
}

/**
 * Cleans stale localStorage data when a new version is detected.
 * Preserves user session & favorites, clears form drafts and old caches.
 */
function cleanStaleData(newVersion: string) {
  try {
    const storedVersion = localStorage.getItem("maksab_app_version");
    if (storedVersion === newVersion) return;

    // Keys to preserve across updates
    const PRESERVE_KEYS = [
      "maksab_user_session",
      "maksab_favorites",
      "maksab_app_version",
    ];

    // Keys to always clear on update (form drafts, stale search data)
    const CLEAR_KEYS = [
      "maksab_recent_searches",
      "maksab_search_wishes",
    ];

    CLEAR_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Clear any ad draft data (keys starting with maksab_draft_)
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (key.startsWith("maksab_draft_") || key.startsWith("maksab_form_")) {
        localStorage.removeItem(key);
      }
    });

    // Update stored version
    localStorage.setItem("maksab_app_version", newVersion);
    console.log(`[Maksab] Updated to version ${newVersion}, cleaned stale data`);
  } catch {
    // localStorage might be full or unavailable
  }
}
