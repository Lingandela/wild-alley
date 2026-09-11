# Agent handoff — Wild Alley

Snapshot for another coding agent (Astra / ChatGPT / Codex / etc.). The player is **not happy with the current build**. Treat this as a playable but unfinished carnival: fix feel, visuals, and interaction. Do not rewrite the architecture unless a constraint below is blocking the fix.

Public repo: https://github.com/Lingandela/wild-alley  
HEAD at handoff: look-down bifold wallet + pinned parlor art.

## What this is

A first-person 3D skee-ball carnival in the browser.

- Walk a stuffed-animal parlor, walk up to the machine, press START.
- Sit, look down at a **3D bifold wallet**, tear tickets, roll a wooden ball up a ramp into cups.
- Tickets are Balatro-ish modifiers (split, magnet, heavy, …). Cups pay chips × multiplier.
- Five alleys (classic / pinball / golf / long / chaos). Versus is local pass-and-play with sabotage tickets.
- 100-cups can dump you into a side **plinko** or **pinball** cabinet.

## Hard constraints (do not violate)

1. **Play ball is 2D.** `Session.stepRoll` + `src/game/physics.ts`, presented with `ballWorld()` / `holeWorld()` in `layout3d.ts`. **Do not** make the play ball a Rapier rigid body. Rapier grab-throw was tried and abandoned.
2. **Session is the authority.** Scoring, phases, tickets, seats live in `src/game/session.ts`. Meshes only present that state. Do not hide rules in the R3F tree.
3. **No accounts, no database.** `localStorage` via `src/game/save.ts` only. Do not add auth routes or `@/lib/db` usage for the game.
4. **No networked multiplayer.** Pass-and-play is local. Do not add P2P / sockets. (`src/lib/multiplayer/` is unused scaffolding.)
5. **A/D english is player-visible left/right** while aiming/rolling. Walking is FPS strafe. Keep `window.__controlsTest` (`setKeys`, `getYaw`, `getSpeed`).
6. **Shared `retro()` materials are immortal** (`dispose` is a no-op). Disposing them on lane remount blacks the parlor.
7. **Do not parent a depth-test-off overlay to the camera.** That covered the whole framebuffer. The wallet is a **world-space viewmodel** that copies the camera transform in `useFrame`.
8. **Do not put `walletOpen` in the ArcadeCanvas `view` key** if that remounts the scene. Wallet visibility is read from `game.session` in `useFrame`.

## Stack

- TanStack Start + React 19 + Tailwind v4
- `@react-three/fiber` + drei + Three.js
- `@react-three/rapier` — player capsule, parlor colliders, bonus cabinets only
- Vite via `npm run dev` (binds `0.0.0.0:8080`)

Dev: `npm install && npm run dev`  
Check: `npm run typecheck` && `npm run build`  
Logic: `node --experimental-strip-types --import ./scripts/register-ts.mjs --test scripts/game-foundations.test.mjs`

## File map

```
src/game/session.ts          phases, scoring, tickets, sit/stand, wallet flags
src/game/foundations.ts      capture height, delayed split, face mapping, labels
src/game/physics.ts          2D ball integration
src/game/layout3d.ts         meters, skee cups, ballWorld / seatEye
src/game/lanes.ts            five alley defs
src/game/cards.ts            ticket / sabotage / prize effects
src/game/game.ts             WildAlleyGame facade, __qa, __controlsTest
src/game/input.ts            held keys (event.code), pointer lock, look delta
src/game/retroMat.ts         cached lambert materials + painted signs/cards
src/game/anim.ts             springs / AnimBus (to() seeds at 0, not target)
src/components/game/GameRoot.tsx
src/components/game/Overlays.tsx
src/components/game/world/ArcadeCanvas.tsx   scene, Sim loop, score lamp
src/components/game/world/LaneMachine.tsx    table, ramp, head, cups
src/components/game/world/PlayBall.tsx       2D sim → mesh
src/components/game/world/Player.tsx         FPS walk + seated look
src/components/game/world/Wallet.tsx         bifold viewmodel
src/components/game/world/Room.tsx           parlor, wall art, lamps
src/components/game/world/AbilityFX.tsx      split / magnet / etc. juice
public/tex/                  wood, leather, prizes, posters, …
```

## Runtime / debug

```js
window.__qa()        // { screen, phase, walletOpen, seated, ballsLeft, hand, selected, lookPitch }
window.__controlsTest.setKeys(['KeyW'])  // inject held keys; [] clears
window.__controlsTest.getYaw()
window.__controlsTest.getSpeed()
```

Phases: `demo | intro | pick | aim | roll | tally | prize | bonus | handoff | results`  
Screens: `menu | how | play | results`

## Keyboard (current contract)

- **Menu / walking:** WASD move, mouse look, click START or Play.
- **Seated pick/intro:** E / look-down / S opens wallet. **W / Space** edge → `readyThrow` then **must release** before charge (`chargeLock`). Enter also readies.
- **Seated aim:** hold W/Space or drag to charge, release to launch. A/D english. Wallet closed.
- **Q** stand / sit near the cabinet.
- Look-down (`lookPitch < -0.45`) or seated S auto-opens the wallet (`walletPinned = false`). E pins it. Looking up closes an unpinned wallet.

## Known pain (start here)

The owner’s last notes: keyboard felt wrong, looking down had no wallet, textures floated. Those three were just patched. Remaining / likely still wrong:

- Wallet is a viewmodel in the lower third; some ticket faces wash out white; scale/pose still “in the air” rather than sitting on a lap.
- Skee face, cup readability, and alley length have been through several rebuilds — still not “a real skee-ball table” to the owner’s eye.
- Bonus cabinets (plinko/pinball) sit in the open floor at x = ±3.35, not against a wall.
- `npm run dev` is the live path. Production smoke sometimes snapshots before the canvas mounts (`hasCanvas: false`) — that is timing, not a blank app.
- Do not “fix” inverted A/D by flipping walking strafe. The vehicle-style probe uses `forceForward` + `nudgeHeading` after Start Carnival seats you.

## What good looks like

- Look down → a **physical bifold** with credit-card slots, tickets you hover/click/tear.
- Table reads as wood, ramp, concentric rings, 50 in the center, 100s in the top corners, 10 as the large bottom catch. No plexiglass cage. No black void holes.
- Walk the parlor without a blocking menu. Art is on walls, lamps on the ceiling, nothing floating.
- Sit, pick tickets, roll, stand up, walk away. No soft-lock.

## Out of scope unless asked

Auth, cloud saves, ranked netcode, replacing the 2D play-ball with Rapier, a second UI framework.
