# Wild Alley

First-person carnival skee-ball in the browser. Walk the parlor, sit at the machine, roll wood into cups. Tickets in a look-down bifold wallet stack multipliers. Five alleys, pass-and-play sabotage, plinko and pinball cups.

This is a **playable foundation**, not a finished carnival. Visual polish, feel, and some interaction still need work.

**Repo:** [github.com/Lingandela/wild-alley](https://github.com/Lingandela/wild-alley)

If you are another coding agent picking this up, read **[AGENT.md](./AGENT.md)** first.

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (dev binds `0.0.0.0:8080`).

```bash
npm run typecheck
npm run build
node --experimental-strip-types --import ./scripts/register-ts.mjs --test scripts/game-foundations.test.mjs
```

Node 22. Auth and a database are **off** — scores live in `localStorage`.

## Play

| Input | Action |
|---|---|
| WASD | Walk the parlor (click the canvas to mouse-look) |
| START on the machine, or **Play** | Sit down and start a carnival |
| Look down / hold **S** (seated) / **E** / **Wallet** | Open the bifold. Click a ticket (two max). Keys **1–5** also work |
| **Throw** or tap **W** | Ready a throw (does not launch on the same press) |
| Hold **W / Space** or drag back, release | Charge and roll |
| **A / D** | English (aim / while the ball is live) |
| **Q** / **Walk** | Stand up. **Sit** puts you back at the table |

## Stack

TanStack Start + React 19 + Tailwind v4. 3D is Three.js via `@react-three/fiber` + drei. Rapier is **only** for walking, room colliders, and bonus cabinets.

The **play ball is not a Rapier body.** Simulation is 2D (`session.stepRoll` → `physics.ts`) mapped into the room with `ballWorld()` in `layout3d.ts`.

## Layout

| Path | What it is |
|---|---|
| [`src/game/session.ts`](src/game/session.ts) | Phases, scoring, cards, throw/roll — the authority |
| [`src/game/foundations.ts`](src/game/foundations.ts) | Capture height, delayed split, shared face mapping |
| [`src/game/physics.ts`](src/game/physics.ts) | Ball step on the 2D lane |
| [`src/game/layout3d.ts`](src/game/layout3d.ts) | 2D lane → 3D table |
| [`src/game/lanes.ts`](src/game/lanes.ts) | The five alleys |
| [`src/game/cards.ts`](src/game/cards.ts) | Ticket / sabotage / prize effects |
| [`src/game/game.ts`](src/game/game.ts) | Thin facade: audio, input, juice, `window.__qa` / `__controlsTest` |
| [`src/components/game/world/`](src/components/game/world/) | R3F room, table, ball, player, wallet |
| [`src/components/game/Overlays.tsx`](src/components/game/Overlays.tsx) | DOM HUD (wallet tray, how-to, pause) |

## License

MIT. See [LICENSE](./LICENSE).
