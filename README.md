# Wild Alley

A first-person carnival skee-ball game. Sit at the machine, pull back, roll wood into cups. Tickets in a bifold wallet stack multipliers. Five alleys, pass-and-play sabotage, plinko and pinball cups.

## Play

- **Start Carnival** sits you at the table. Hold **W / Space** (or drag back), release to roll. **A / D** add english.
- **E** opens the wallet. Hover a ticket, click to tear it.
- From the menu you can walk the parlor (**WASD**, click to look).

## Layout (for expanding)

Keep the split. Simulation is 2D; the room is a view of that sim.

| Path | What it is |
|---|---|
| [`src/game/session.ts`](src/game/session.ts) | Phases, scoring, cards, throw/roll |
| [`src/game/physics.ts`](src/game/physics.ts) | Ball step on the 2D lane |
| [`src/game/layout3d.ts`](src/game/layout3d.ts) | 2D lane → 3D table (`ballWorld`, `holeWorld`) |
| [`src/game/lanes.ts`](src/game/lanes.ts) | The five alleys |
| [`src/game/cards.ts`](src/game/cards.ts) | Ticket / sabotage / prize effects |
| [`src/components/game/world/`](src/components/game/world/) | R3F room, table, ball, player, wallet |

Add a lane in `lanes.ts`. Map it in `layout3d.ts` only if the table shape changes. Don’t put scoring in the meshes.

The play ball is **not** a Rapier body. Rapier is walking, room colliders, and the bonus cabinets.

## Scripts

```bash
npm run dev        # live preview
npm run typecheck
npm run build
```
