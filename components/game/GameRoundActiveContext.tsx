"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type GameRoundActiveContextValue = {
  roundActive: boolean;
  setRoundActive: (active: boolean) => void;
};

const GameRoundActiveContext = createContext<GameRoundActiveContextValue | null>(null);

export function GameRoundActiveProvider({ children }: { children: ReactNode }) {
  const [roundActive, setRoundActiveState] = useState(false);
  const setRoundActive = useCallback((active: boolean) => {
    setRoundActiveState(active);
  }, []);

  const value = useMemo(
    () => ({ roundActive, setRoundActive }),
    [roundActive, setRoundActive],
  );

  return (
    <GameRoundActiveContext.Provider value={value}>{children}</GameRoundActiveContext.Provider>
  );
}

export function useGameRoundActive() {
  const ctx = useContext(GameRoundActiveContext);
  if (!ctx) {
    throw new Error("useGameRoundActive must be used within GameRoundActiveProvider");
  }
  return ctx;
}

export function useGameRoundActiveOptional() {
  return useContext(GameRoundActiveContext);
}
