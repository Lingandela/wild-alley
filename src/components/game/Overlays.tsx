import { Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Snapshot, UiCard } from "@/game/types";
import type { WildAlleyGame } from "@/game/game";

function Ticket({
  card,
  selected,
  onClick,
  compact,
}: {
  card: UiCard;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const tone =
    card.type === "sabotage" ? "text-danger" : card.type === "score" ? "text-copper" : "text-fg";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "ticket relative min-w-[7.5rem] flex-1 px-4 text-left",
        compact ? "py-2" : "py-3",
        selected ? "ring-2 ring-copper" : "opacity-90 hover:opacity-100",
      )}
    >
      <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted">{card.type}</p>
      <p className={cn("font-display text-base leading-tight", tone)}>{card.name}</p>
      <p className="mt-1 text-xs leading-snug text-muted">{card.text}</p>
    </button>
  );
}

function Menu({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-4 top-[max(0.9rem,env(safe-area-inset-top))]">
        <p className="font-display text-4xl tracking-[-0.03em] text-fg [text-shadow:0_2px_0_#1a1010] sm:text-5xl">
          Wild Alley
        </p>
        <p className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-muted">Walk up · press START</p>
        <p className="mt-1 text-xs tabular-nums text-muted">Best carnival {snap.highScore}</p>
      </div>
      <div className="pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 flex flex-wrap gap-2">
        <button type="button" className="ticket px-4 py-2 font-display" onClick={() => game.startCarnival()}>
          Play
        </button>
        <button type="button" className="ticket px-4 py-2 text-sm text-muted" onClick={() => game.startVersus()}>
          Pass & Play
        </button>
        <button type="button" className="ticket px-4 py-2 text-sm text-muted" onClick={() => game.showHow(true)}>
          How to play
        </button>
      </div>
    </div>
  );
}

function How({ game }: { game: WildAlleyGame }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center px-5">
      <div className="ticket w-full max-w-md p-6">
        <h2 className="font-display text-2xl">House rules</h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <li>Walk the parlor with WASD. Click to look. Walk up and hit START on the machine (or Play). Q stands up; Sit puts you back at the table.</li>
          <li>Look down at your lap or press E / Wallet. Tickets sit in the card slots — click one (two max). Then Throw or tap W. Hold W / Space or drag back, release to roll. A and D add english.</li>
          <li>Cups pay chips. Tickets build mult. Some cups dump you into plinko or pinball.</li>
          <li>Pass & Play: while their ball is live, open the wallet for sabotage.</li>
        </ul>
        <button type="button" className="ticket mt-6 w-full px-5 py-3 font-display" onClick={() => game.showHow(false)}>
          Back
        </button>
      </div>
    </div>
  );
}

function Hud({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="[text-shadow:0_2px_0_#100c12]">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted">{snap.laneName}</p>
        <p className="font-display text-2xl tabular-nums leading-none">
          {snap.isVersus ? `${snap.scores[0]}  ·  ${snap.scores[1]}` : snap.scores[0]}
        </p>
        <p className="mt-1 text-xs text-muted">
          {snap.ballsLeft} left · alley {snap.laneIndex + 1}/{snap.laneCount}
        </p>
      </div>
      <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
        <button type="button" className="ticket px-3 py-2 font-display text-sm" onClick={() => game.toggleWallet()}>
          {snap.walletOpen ? "Close wallet" : "Wallet"}
        </button>
        {snap.seated ? (
          <button type="button" className="ticket px-3 py-2 text-sm" onClick={() => game.standUp()}>
            Walk
          </button>
        ) : (
          <button type="button" className="ticket px-3 py-2 text-sm" onClick={() => game.sitDown()}>
            Sit
          </button>
        )}
        {(snap.phase === "pick" || snap.phase === "intro") && (
          <button type="button" className="ticket px-3 py-2 font-display text-sm" onClick={() => game.ready()}>
            Throw
          </button>
        )}
        <button
          type="button"
          className="ticket grid size-11 place-items-center"
          aria-label="Mute"
          onClick={() => game.toggleMute()}
        >
          {snap.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
        <button
          type="button"
          className="ticket grid size-11 place-items-center"
          aria-label="Pause"
          onClick={() => game.togglePause()}
        >
          <Pause className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Intro({ snap }: { snap: Snapshot }) {
  if (snap.phase !== "intro") return null;
  return (
    <div className="absolute inset-x-0 top-16 z-10 flex justify-center">
      <div className="text-center [text-shadow:0_2px_0_#100c12]">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Now serving</p>
        <h2 className="mt-1 font-display text-4xl">{snap.introName}</h2>
        <p className="mt-2 text-sm text-muted">{snap.laneBlurb}</p>
      </div>
    </div>
  );
}

function AimHint({ snap }: { snap: Snapshot }) {
  if (snap.walletOpen) return null;
  if (snap.phase === "aim") {
    return (
      <p className="absolute inset-x-0 bottom-6 z-10 text-center text-sm text-muted [text-shadow:0_2px_0_#100c12]">
        Hold W / Space or drag back · release to roll · A/D english
      </p>
    );
  }
  if (snap.phase === "pick" || snap.phase === "intro") {
    return (
      <p className="absolute inset-x-0 bottom-6 z-10 text-center text-sm text-muted [text-shadow:0_2px_0_#100c12]">
        Wallet to pick tickets · look down at your lap · W throws · Q walks away
      </p>
    );
  }
  if (snap.canSabotage) {
    return (
      <p className="absolute inset-x-0 bottom-6 z-10 text-center text-sm text-danger [text-shadow:0_2px_0_#100c12]">
        Ball is live — open the wallet for sabotage
      </p>
    );
  }
  if (snap.phase === "roll") {
    return (
      <p className="absolute inset-x-0 bottom-6 z-10 text-center text-sm text-muted [text-shadow:0_2px_0_#100c12]">
        A left · D right english
      </p>
    );
  }
  return null;
}

function WalletTray({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  if (!snap.walletOpen) return null;
  const list = snap.canSabotage ? snap.sabotageHand : snap.hand;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto w-full max-w-3xl">
        <p className="mb-1 text-center text-xs text-muted [text-shadow:0_2px_0_#100c12]">
          {snap.canSabotage ? "Tear a sabotage ticket" : "Click a ticket in the wallet · two max · 1–5"}
        </p>
        {list.length === 0 ? (
          <p className="text-sm text-muted">Empty pockets.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((c) => (
              <Ticket
                key={c.uid}
                card={c}
                selected={snap.selected.includes(c.uid)}
                compact
                onClick={() => {
                  if (snap.canSabotage) game.sabotage(c.uid);
                  else game.toggleCard(c.uid);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TouchPad({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  if (snap.screen === "how" || snap.screen === "results") return null;
  return (
    <div className="absolute inset-x-0 bottom-16 z-20 flex items-end justify-between px-3 sm:hidden">
      <div className="pointer-events-auto grid grid-cols-3 gap-1">
        <span />
        <button
          type="button"
          className="ticket grid size-12 place-items-center font-display"
          onPointerDown={() => game.input.keys.add("KeyW")}
          onPointerUp={() => game.input.keys.delete("KeyW")}
          onPointerCancel={() => game.input.keys.delete("KeyW")}
        >
          W
        </button>
        <span />
        <button
          type="button"
          className="ticket grid size-12 place-items-center font-display"
          onPointerDown={() => game.input.keys.add("KeyA")}
          onPointerUp={() => game.input.keys.delete("KeyA")}
          onPointerCancel={() => game.input.keys.delete("KeyA")}
        >
          A
        </button>
        <button
          type="button"
          className="ticket grid size-12 place-items-center font-display"
          onPointerDown={() => game.input.keys.add("KeyS")}
          onPointerUp={() => game.input.keys.delete("KeyS")}
          onPointerCancel={() => game.input.keys.delete("KeyS")}
        >
          S
        </button>
        <button
          type="button"
          className="ticket grid size-12 place-items-center font-display"
          onPointerDown={() => game.input.keys.add("KeyD")}
          onPointerUp={() => game.input.keys.delete("KeyD")}
          onPointerCancel={() => game.input.keys.delete("KeyD")}
        >
          D
        </button>
      </div>
      <button
        type="button"
        className="pointer-events-auto ticket px-4 py-3 font-display"
        onClick={() => game.toggleWallet()}
      >
        Wallet
      </button>
    </div>
  );
}

function Tally({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  if (snap.phase !== "tally") return null;
  return (
    <button type="button" className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center px-5" onClick={() => game.skipTally()}>
      <div className="ticket w-full max-w-xs p-5 text-left">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Throw settled</p>
        <ul className="mt-3 space-y-1.5">
          {snap.tally.map((line) => (
            <li
              key={line.label}
              className={cn(
                "flex items-baseline justify-between text-sm",
                line.kind === "total" && "mt-2 border-t border-border pt-2 font-display text-xl",
                line.kind === "mult" && "text-copper",
              )}
            >
              <span className="text-muted">{line.label}</span>
              <span className="tabular-nums">{line.value}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-muted">Tap the stub</p>
      </div>
    </button>
  );
}

function Prize({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  if (snap.phase !== "prize") return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-end justify-center px-3 pb-8 sm:items-center">
      <div className="w-full max-w-md">
        <h2 className="text-center font-display text-3xl [text-shadow:0_2px_0_#100c12]">Carnival prize</h2>
        <p className="mb-4 text-center text-sm text-muted">Pick a ticket for the next alley.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {snap.prizes.map((c) => (
            <Ticket key={c.uid} card={c} onClick={() => game.pickPrize(c.uid)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Handoff({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  if (snap.phase !== "handoff") return null;
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center px-5">
      <div className="ticket w-full max-w-sm p-6 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">Pass the device</p>
        <h2 className="mt-2 font-display text-3xl">{snap.names[snap.player]} is up</h2>
        <p className="mt-2 text-sm text-muted">Sabotage from the wallet while their ball is live.</p>
        <button type="button" className="ticket mt-6 w-full px-5 py-3 font-display" onClick={() => game.handoff()}>
          I have it
        </button>
      </div>
    </div>
  );
}

function Results({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  if (snap.screen !== "results") return null;
  const title = snap.isVersus
    ? snap.winner < 0
      ? "Draw"
      : `${snap.names[snap.winner]} takes the alley`
    : "Carnival closed";
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center px-5">
      <div className="ticket w-full max-w-sm p-6 text-center">
        <h2 className="font-display text-3xl">{title}</h2>
        <p className="mt-3 font-display text-4xl tabular-nums">
          {snap.isVersus ? `${snap.scores[0]}  —  ${snap.scores[1]}` : snap.scores[0]}
        </p>
        {!snap.isVersus && <p className="mt-2 text-sm text-muted">Best {snap.highScore}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            className="ticket px-5 py-3 font-display text-lg"
            onClick={() => (snap.isVersus ? game.startVersus() : game.startCarnival())}
          >
            Play again
          </button>
          <button type="button" className="ticket px-5 py-3" onClick={() => game.toMenu()}>
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function Paused({ game }: { game: WildAlleyGame }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center px-5">
      <div className="ticket w-full max-w-sm p-6 text-center">
        <h2 className="font-display text-3xl">Paused</h2>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" className="ticket px-5 py-3 font-display" onClick={() => game.togglePause()}>
            Resume
          </button>
          <button type="button" className="ticket px-5 py-3" onClick={() => game.toMenu()}>
            Quit to menu
          </button>
        </div>
      </div>
    </div>
  );
}

function Flash({ snap }: { snap: Snapshot }) {
  if (!snap.flash) return null;
  return (
    <div className="absolute inset-x-0 top-1/3 z-20 text-center">
      <p className="font-display text-3xl text-fg [text-shadow:0_3px_0_#100c12]">{snap.flash}</p>
    </div>
  );
}

function LookHint({ snap }: { snap: Snapshot }) {
  if (snap.pointerLocked || snap.walletOpen || snap.screen === "how" || snap.screen === "results" || snap.screen === "play")
    return null;
  return (
    <p className="absolute inset-x-0 top-1/2 z-10 hidden -translate-y-16 text-center text-xs uppercase tracking-[0.2em] text-muted [text-shadow:0_2px_0_#100c12] sm:block">
      WASD walk · click to look · START on the machine
    </p>
  );
}

export function Overlays({ game, snap }: { game: WildAlleyGame; snap: Snapshot }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {snap.screen === "menu" && <Menu game={game} snap={snap} />}
      {snap.screen === "how" && <How game={game} />}
      {snap.screen === "play" && (
        <>
          <Hud game={game} snap={snap} />
          <Intro snap={snap} />
          <AimHint snap={snap} />
          <WalletTray game={game} snap={snap} />
          <Tally game={game} snap={snap} />
          <Prize game={game} snap={snap} />
          <Handoff game={game} snap={snap} />
          <Flash snap={snap} />
          {snap.paused && <Paused game={game} />}
        </>
      )}
      {snap.screen === "results" && <Results game={game} snap={snap} />}
      <LookHint snap={snap} />
      <TouchPad game={game} snap={snap} />
    </div>
  );
}
