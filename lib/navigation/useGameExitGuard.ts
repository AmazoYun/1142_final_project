"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const BEFORE_UNLOAD_MESSAGE =
  "此操作無法退還代幣，也無法獲取分數，確定繼續？";

export function useGameExitGuard(roundActive: boolean) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const exitActionRef = useRef<(() => void) | null>(null);
  const skippingGuardRef = useRef(false);
  const roundActiveRef = useRef(roundActive);

  roundActiveRef.current = roundActive;

  const requestExit = useCallback((action: () => void) => {
    if (!roundActiveRef.current) {
      action();
      return;
    }
    exitActionRef.current = action;
    setConfirmOpen(true);
  }, []);

  const confirmExit = useCallback(() => {
    setConfirmOpen(false);
    const action = exitActionRef.current;
    exitActionRef.current = null;
    action?.();
  }, []);

  const cancelExit = useCallback(() => {
    setConfirmOpen(false);
    exitActionRef.current = null;
  }, []);

  useEffect(() => {
    if (!roundActive) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (skippingGuardRef.current) return;
      event.preventDefault();
      event.returnValue = BEFORE_UNLOAD_MESSAGE;
    };

    const pushGuardState = () => {
      history.pushState({ gameExitGuard: true }, "", window.location.href);
    };

    pushGuardState();

    const onPopState = () => {
      if (skippingGuardRef.current || !roundActiveRef.current) return;
      pushGuardState();
      exitActionRef.current = () => {
        skippingGuardRef.current = true;
        history.back();
      };
      setConfirmOpen(true);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [roundActive]);

  return {
    confirmOpen,
    requestExit,
    confirmExit,
    cancelExit,
  };
}
