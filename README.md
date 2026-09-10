# Wild Alley

A first-person carnival skee-ball game. Walk the parlor, sit at the machine, pull back, roll wood into cups. Tickets in a bifold wallet stack multipliers. Five alleys, pass-and-play sabotage, plinko and pinball cups.

## Play

- **Walk** the parlor with **WASD**. Click to look. Walk up to the machine and press **START** (or Enter when close). Balls roll down the return rail.
- Hold **W / Space** (or drag back), release to roll. Cream dots preview the path. **A / D** add english.
- **E** opens the wallet. Tickets live in the card slots. Hover to slide one out, click (or 1–5) to tear it onto the table.
- **Pass & Play** is the second plate on the coin door. Sabotage from the wallet while their ball is live.

## Layout (for expanding)

Keep the split. Simulation is 2D; the room is a view of that sim. `Session` is the authority — `snapshot()` is the public state a future party room would send. Do not hide scoring in the meshes.

| Path | What it is |
|---|---|
| [`src/game/session.ts`](src/game/session.ts) | Phases, scoring, cards, throw/roll |
| [`src/game/physics.ts`](src/game/physics.ts) | Ball step on the 2D lane |
| [`src/game/layout3d.ts`](src/game/layout3d.ts) | 2D lane → 3D table (`ballWorld`, `holeWorld`), parlor size |
| [`src/game/lanes.ts`](src/game/lanes.ts) | The five alleys |
| [`src/game/cards.ts`](src/game/cards.ts) | Ticket / sabotage / prize effects |
| [`src/components/game/world/`](src/components/game/world/) | R3F room, table, ball, player, wallet |

Add a lane in `lanes.ts`. Map it in `layout3d.ts` only if the table shape changes.

The play ball is **not** a Rapier body. Rapier is walking, room colliders, and the bonus cabinets.

## Scripts

```bash
npm run dev        # live preview
npm run typecheck
npm run build
```
