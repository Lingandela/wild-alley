# Wild Alley: foundation repair and game direction

## Recommendation

Keep Three.js / React Three Fiber. The repository shows modeling, projection, input ownership and simulation problems; it does not establish a renderer limitation. Changing engines now would recreate these problems in a new codebase. Keep Session as the rules authority and the custom lane simulation. Reassess a native engine only if browser delivery stops being a goal or a tested requirement exceeds the browser's practical budget.

The core promise: roll a satisfying wooden ball, pull a strange paper ticket out of your wallet, and create a ridiculous but understandable outcome with friends. The ordinary roll must be fun before modifiers make it chaotic.

## Findings and first repair pass

| Finding in the original source | Change in this branch |
| --- | --- |
| Target toruses rotated 90 degrees away from the scoring face | Rings face the player and sit on the target |
| Cup meshes were capped cylinders on an unbroken face | Open cup sleeves and actual cutouts in the visible board |
| 100s sat beyond the legal horizontal ball range | Widened playing surface and shared target mapping; both corners tested reachable |
| Ball switched from ramp coordinates directly onto the target face | Classic lane now uses a curved ramp, free flight with gravity and target contact |
| Plan-view overlap could score an airborne ball | Height/contact checks before capture; substepped Session capture |
| Split spawned two balls immediately at launch | One ball leaves the hand, then splits during the roll |
| Look-down wallet retained pointer lock | Wallet releases the cursor and blocks look motion while selecting |
| Wallet could reopen immediately after readying, or preserve a pending charge | Ready returns the camera to the lane; opening wallet cancels charge |
| Ticket faces were lit like scenery and styled like bank cards | Unlit paper-stub faces; closer, less tilted wallet pose |
| Shared vertices used coarse screen-space snapping, while nearby art did not | Stable geometry by default, preserving low-poly assets and pixel filtering |
| All power lamps shared one mutated material | Independent lamp materials |
| Numeric cup labels could disagree with ticket-modified scores | Numeric labels follow changed values; Wide updates visible classic openings |
| Walking into scenery bumpers could award chips from an R3F callback | Removed presentation-side scoring callback |
| Lockfile failed a clean dependency install | Repaired missing nested dependency entries |

The new physical path is specifically the **classic lane**. Other lane types retain their previous simulation and still require geometry/physics alignment. Shared cabinet/material improvements also affect them.

## Verification and limits

- TypeScript and production build checked.
- Nine focused regression tests cover central cup reachability, both corner 100s, overshoots, contact-only capture, render/simulation target alignment, delayed splitting, ticket spending, wallet state, label/size updates and frame-rate consistency.
- Run `node --experimental-strip-types --import ./scripts/register-ts.mjs --test scripts/game-foundations.test.mjs` to repeat them. They test game logic, not browser input dispatch or rendered pixels.
- Preview server started, but the cloud browser rejected its address with `ERR_BLOCKED_BY_CLIENT`. No claim of visual or end-to-end approval is made.
- Cup capture is still an arcade tolerance test against the target surface. Individual ring rims do not yet have physical collision volumes. A scored ball hides; a proper cup-drop and ball-return animation is still needed.
- The 3D wallet still needs a human check for card overlap, hover/tear hit targets, framing and lighting at different aspect ratios. The DOM ticket tray remains an accessible fallback.
- Online multiplayer is not implemented. Current versus remains two-player local pass-and-play.

## Next milestone: one excellent machine

1. **Finish the physical model.** Give each ring and cup lip matching collision geometry; allow rim rattles, bank shots and true misses. Implement a short captured-ball descent followed by a visible return trough. One source of dimensions must drive meshes, collision, score regions and camera framing.
2. **Tune the throw by playtesting.** Test a new player without coaching. Adjust charge range, horizontal aim and feedback from observed misses. Add separate touch/gamepad input adapters and remappable controls. Avoid unrelated mouse motion steering a charge.
3. **Complete the wallet interaction.** Looking down reveals it in a consistent lap pose. Hover extracts one stub so its entire effect can be read. Click/drag tears it, shows an armed stub on the cabinet, and uses a clear cancel/reinsert gesture. A full wallet should never cover the selected card's text. Keyboard and touch must do the same actions.
4. **Make consequences readable.** Ball contact sounds should distinguish wood, rail, rubber and cup. Use a short split pop at the actual split event, a restrained score light, and a visible chip-to-multiplier tally. Score effects should be explainable from the resulting receipt.
5. **Check the entire loop.** Start → wallet → choose → ready → charge → roll → settle → tally → next ball → prize → next room → results. Include pause, stand/sit, tab switching and restarting. Repeated runs must not accumulate textures/materials.

Acceptance: a new player can explain how to throw, predict roughly where a shot will land, select and identify a ticket, and finish a machine without getting stuck. Normal skee-ball should remain enjoyable with zero tickets.

## Art direction: a tactile, slightly crooked carnival

Use warm varnished wood, chipped cherry paint, cream enamel, oxidized brass, ink-stamped paper and leather. Keep low-poly shapes, authored lighting and restrained texture resolution. Remove vertex wobble from gameplay surfaces so the retro treatment never looks like broken geometry.

The memorable elements should be the cabinet silhouette, oversized readable rings, a glove-free hand holding a battered wallet, and ticket perforations tearing across the screen. Make decorative machines feel built from parts rather than photographs pasted on boxes. Ground everything: brackets behind signs, cords above lamps, feet and contact shadows below cabinets, frames around printed art.

Perform an asset pass after the cabinet is validated: consistent texel density, UVs that follow wood grain, fewer full-scene photographs, less emissive washout, clear value contrast between ball/lane/target, and a small atlas per room. Then create a few distinctive machines with different profiles instead of recoloring the same silhouette.

## Ticket systems worth building

Start with 6–8 effects whose behavior is unmistakable. Define activation timing, ownership, duration, stacking, cancellation and score consequences as data in Session.

- **Splitter:** two descendants after release; both score, one throw spent. Later: a rare chain-split upgrade with a strict ball cap.
- **Magnet:** visible attraction toward one nominated cup, limited range and strength.
- **Heavy:** low bounce, stronger bumper impacts, chip bonus; clear tradeoff in ramp height.
- **Rubber:** high restitution and ring ricochets, rewarding skillful banks.
- **Wide Mouth:** physically larger opening and visibly enlarged rim, with matching capture rules.
- **Swap Ink:** swap visible scores before release; physical cup positions stay readable.
- **Insurance:** refund a ticket or small reward on a genuine gutter, not an automatic win.
- **Double or Nothing:** clearly shown risk on the next throw and a receipt explaining the payout.

Build synergies deliberately: Splitter + Magnet for coverage, Rubber + bank-shot bonus, Heavy + bumper chips, a low-cup build that makes a difficult precision shot strategically unnecessary. Separate base chips, additive multipliers and multiplicative effects in a fixed, displayed order. Bound the extreme combinations so fun does not become a frozen browser or an unreadable score.

## Rooms and progression

Make room transitions change decisions, not merely colors. The machine should visibly transform before the player commits a ticket.

| Room | Mechanical identity | Fairness requirement |
| --- | --- | --- |
| Fairground | Ordinary skee-ball and first ticket combinations | Establish predictable baseline physics |
| Stretch Hall | Lane extends toward a roughly 30-foot run | Surface, camera, physics and controls share the new dimensions; current Long Roll does not do this |
| Pinball Parlor | Bumpers and bank-shot routes | Ball elevation determines whether it clears an obstacle |
| Clockwork Gallery | Moving cups with a known rhythm | Motion and capture use the same positions every simulation tick |
| Wind Tunnel | Fans and alternating crosswinds | Show direction and timing before a throw |
| Midnight House | One announced house rule per round | Never silently alter a cup after a player has aimed |

Between rooms: choose one of three tickets, spend earned tickets at a small prize counter, repair/discard a weak option, or vote with the party on the next route. Keep a short run structure first; add longer campaigns after replay value is proven.

## Multiplayer destination: 1–4 friends

Start with a playable four-seat local/session model, then online private rooms. The existing two-element score/name/hand tuples and `1 - player` opponent logic need an explicit player model before networking. `snapshot()` currently omits full ball and deck state, so it is not a complete network protocol.

For online play, design a single authoritative simulation with seeded lane generation, player input commands, ordered ticket events and validated score events. Clients render interpolated state; do not allow each browser to independently decide collisions or scores. Plan reconnect, host departure, spectators and late joins before adding ranked features.

First online mode: short alternating throws with spectator reactions and one timed, telegraphed sabotage opportunity. This reduces synchronization demands and makes each friend's shot a shared moment. Later try simultaneous neighboring lanes with visible cross-lane effects. Let a lobby choose gentle competition or unrestricted chaos, and keep sabotage recoverable rather than removing a player's entire turn.

The social fun can come from shared room votes, clutch last balls, narrated score receipts, physical victory tickets, silly personal titles and a replay of the round's wildest shot. Voice chat, accounts, ranked play and economies can wait until private rooms consistently produce fun sessions.

## Suggested delivery order

1. Classic cabinet, ball and wallet acceptance pass, including real browser playtesting.
2. Six tested tickets, score receipts and a finished return/next-ball loop.
3. Three polished room types with dimension-driven physics and art.
4. Four-player Session model and local party run.
5. Private online rooms, spectator presentation and recovery handling.
6. More room transformations, combinations, accessibility/performance polish and release testing.

Keep this branch as a reviewable foundation repair. Visual approval and broader lane physics are the next gate before calling it a finished game.
