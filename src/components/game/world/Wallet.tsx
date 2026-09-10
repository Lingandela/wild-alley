import type { WildAlleyGame } from "@/game/game";
import type * as THREE from "three";

/** Tickets live in the DOM wallet tray so they stay clickable. */
export function Wallet({
  game,
  leather,
  suede,
}: {
  game: WildAlleyGame;
  leather: THREE.Texture;
  suede: THREE.Texture;
}) {
  void game;
  void leather;
  void suede;
  return null;
}
