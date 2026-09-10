# Wild Alley

A first-person carnival skee-ball game. Walk the parlor, sit at the machine, roll wood into cups. Tickets in the wallet stack multipliers. Five alleys, pass-and-play sabotage, plinko and pinball cups.

## Play

- **Walk** the parlor with WASD (click to look). Press **START** on the machine, or **Play**.
- Look **down** at your lap (or **E** / **Wallet**) for the bifold. Click a ticket (two max).
- **Throw** or tap **W**, then hold **W / Space** or drag back and release. **A / D** add english.
- **Walk** / **Q** stands you up. **Sit** puts you back at the table.

## Layout (for expanding)

Keep the split. Simulation is 2D; the room is a view of that sim.

| Path | What it is |
|---|---|
| [`src/game/session.ts`](src/game/session.ts) | Phases, scoring, cards, throw/roll — the authority |
| [`src/game/physics.ts`](src/game/physics.ts) | Ball step on the 2D lane |
| [`src/game/layout3d.ts`](src/game/layout3d.ts) | 2D lane → 3D table (`ballWorld`, `holeWorld`) |
| [`src/game/lanes.ts`](src/game/lanes.ts) | The five alleys |
| [`src/game/cards.ts`](src/game/cards.ts) | Ticket / sabotage / prize effects |
| [`src/components/game/world/`](src/components/game/world/) | R3F room, table, ball, player |

The play ball is **not** a Rapier body. Rapier is walking, room colliders, and the bonus cabinets.

## Scripts

```bash
npm run dev
npm run typecheck
npm run build
```
