"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * KeepAlive - সাইট ওপেন থাকলে সার্ভারলেস ফাংশন warm রাখে
 *
 * কৌশল:
 * 1. প্রতি ৪ মিনিটে /api/warm পিং (serverless function warm)
 * 2. ট্যাব ফোকাস পেলে সাথে সাথে warm (visibility change API)
 * 3. পেজ visible হলে সাথে সাথে warm (document visibility)
 * 4. প্রতিটি পিং-এ ১০ সেকেন্ড timeout (hang প্রতিরোধ)
 */

// Single warm endpoint — keeps all serverless functions warm via Vercel's routing
const WARM_URL = "/api/warm";
const WARM_INTERVAL = 30 * 1000; // 30 seconds — Vercel free plan cold starts after ~60s
const THROTTLE_MS = 30 * 1000; // Don't ping more than once every 30 seconds
const FETCH_TIMEOUT = 10000; // 10 second timeout per ping

export default function KeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWarmTime = useRef<number>(0);

  const warmUp = useCallback(() => {
    // Throttle: don't ping more than once every 45 seconds
    const now = Date.now();
    if (now - lastWarmTime.current < THROTTLE_MS) return;
    lastWarmTime.current = now;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      fetch(WARM_URL, {
        cache: "no-store",
        keepalive: true,
        priority: "low",
        signal: controller.signal,
      })
        .then(() => clearTimeout(timeoutId))
        .catch(() => {
          clearTimeout(timeoutId);
          // Silently fail - this is background activity
        });
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    // Immediately warm on first load
    warmUp();

    // Set up interval
    intervalRef.current = setInterval(warmUp, WARM_INTERVAL);

    // Visibility change handler: when tab becomes visible, warm immediately
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        warmUp();
      }
    };

    // Focus handler: when window gets focus, warm immediately
    const handleFocus = () => {
      warmUp();
    };

    // Online handler: when network reconnects, warm immediately
    const handleOnline = () => {
      warmUp();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    // Cleanup
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, [warmUp]);

  return null; // No UI - invisible component
}
