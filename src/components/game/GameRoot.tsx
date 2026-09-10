import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { WildAlleyGame } from "@/game/game";
import type { Snapshot } from "@/game/types";
import { Overlays } from "./Overlays";
import { writeSave } from "@/game/save";

const ArcadeCanvas = lazy(() => import("./world/ArcadeCanvas").then((m) => ({ default: m.ArcadeCanvas })));

if (typeof window !== "undefined") {
  void import("./world/ArcadeCanvas");
}

const EMPTY: Snapshot = {
  screen: "menu",
  mode: "demo",
  phase: "demo",
  paused: false,
  laneName: "The Fairground",
  laneBlurb: "",
  laneIndex: 0,
  laneCount: 5,
  theme: "classic",
  player: 0,
  names: ["Ace", "Deuce"],
  scores: [0, 0],
  ballsLeft: 3,
  ballsEach: 3,
  chips: 0,
  mult: 1,
  tally: [],
  tallyTotal: 0,
  hand: [],
  selected: [],
  sabotageHand: [],
  canSabotage: false,
  sabotageUsed: false,
  prizes: [],
  power: 0,
  message: "",
  flash: "",
  highScore: 0,
  muted: false,
  lastHole: "",
  introName: "",
  canReady: false,
  walletOpen: false,
  isVersus: false,
  winner: -1,
  pointerLocked: false,
};

export function GameRoot() {
  const gameRef = useRef<WildAlleyGame | null>(null);
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const g = new WildAlleyGame(() => {
      setSnap(g.session.snapshot());
      if (g.session.screen === "results") {
        writeSave({ version: 1, highScore: g.session.highScore, muted: g.session.muted });
      }
    });
    gameRef.current = g;
    setReady(true);
    setSnap(g.session.snapshot());
    return () => {
      g.destroy();
      gameRef.current = null;
    };
  }, []);

  const game = gameRef.current;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0 touch-none [image-rendering:pixelated]">
        {ready && game && (
          <Suspense fallback={<div className="h-full w-full bg-bg" />}>
            <ArcadeCanvas
              game={game}
              view={`${snap.screen}|${snap.phase}|${snap.laneName}|${snap.walletOpen ? 1 : 0}|${snap.selected.join()}|${snap.theme}|${snap.canSabotage ? 1 : 0}|${snap.player}`}
            />
          </Suspense>
        )}
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-10 mix-blend-soft-light opacity-15"
        style={{
          background:
            "repeating-linear-gradient(to bottom, rgba(0,0,0,0.22) 0, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(8,6,8,0.42) 100%)",
        }}
      />
      {game ? (
        <Overlays game={game} snap={snap} />
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p className="font-display text-5xl tracking-[-0.03em] text-fg">Wild Alley</p>
          <p className="mt-1 text-xs uppercase tracking-[0.28em] text-muted">Walk the parlor. Play the wood.</p>
          <div className="mt-4 flex w-full max-w-md flex-col gap-2">
            <button type="button" className="ticket px-5 py-3 font-display text-lg">
              Start Carnival
            </button>
            <button type="button" className="ticket px-5 py-3 font-display text-lg">
              Pass & Play
            </button>
            <button type="button" className="ticket px-5 py-2 text-sm text-muted">
              How to play
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
