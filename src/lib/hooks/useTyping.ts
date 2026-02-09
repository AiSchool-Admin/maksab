/**
 * useTyping — Manages typing indicator state with debounce.
 *
 * When the user types, it broadcasts "isTyping: true".
 * After they stop typing for 2 seconds, it broadcasts "isTyping: false".
 * Also tracks whether the OTHER user is typing.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseTypingParams {
  /** Function to send typing broadcast (from useRealtimeChat) */
  sendTyping: (displayName: string, isTyping: boolean) => void;
  /** Current user's display name */
  displayName: string;
  /** Timeout before "stopped typing" (ms) */
  timeout?: number;
}

interface UseTypingReturn {
  /** Whether the other user is currently typing */
  isOtherTyping: boolean;
  /** Name of the user who is typing */
  typingUserName: string;
  /** Call this when the current user types a character */
  handleLocalTyping: () => void;
  /** Call this when a typing event is received from the other user */
  handleRemoteTyping: (isTyping: boolean, userName: string) => void;
  /** Call when component unmounts or user leaves chat */
  stopTyping: () => void;
}

export function useTyping({
  sendTyping,
  displayName,
  timeout = 2000,
}: UseTypingParams): UseTypingReturn {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState("");

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Broadcast that the local user is typing
  const handleLocalTyping = useCallback(() => {
    // Only send "started typing" if not already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(displayName, true);
    }

    // Reset the stop-typing timer
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(displayName, false);
    }, timeout);
  }, [sendTyping, displayName, timeout]);

  // Handle remote typing event
  const handleRemoteTyping = useCallback(
    (isTyping: boolean, userName: string) => {
      setIsOtherTyping(isTyping);
      setTypingUserName(userName);

      // Auto-clear remote typing after 5 seconds (safety net)
      if (remoteTimeoutRef.current) {
        clearTimeout(remoteTimeoutRef.current);
      }

      if (isTyping) {
        remoteTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, 5000);
      }
    },
    [],
  );

  // Stop typing (call on unmount or send)
  const stopTyping = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTyping(displayName, false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [sendTyping, displayName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTyping();
      if (remoteTimeoutRef.current) {
        clearTimeout(remoteTimeoutRef.current);
      }
    };
  }, [stopTyping]);

  return {
    isOtherTyping,
    typingUserName,
    handleLocalTyping,
    handleRemoteTyping,
    stopTyping,
  };
}
