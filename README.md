# Tidefall: Dead Current

A browser-playable multiplayer PvPvE extraction shooter set in a compact storm-walled archipelago.

## Overview

Spawn at **The Haven**, a protected harbor hub. Craft weapons, accept contracts, board a skiff, sail to dangerous islands, fight AI scavengers and machines, loot resources, encounter other players, and extract safely to bank your rewards. Lose everything you carry if you die in the open waters.

## Tech Stack

- **Client**: TypeScript, Vite, Three.js, WebGL, Pointer Lock API
- **Server**: Node.js, TypeScript, Express, WebSocket (`ws`), authoritative simulation
- **Shared**: TypeScript types and data definitions used by both client and server
- **Persistence**: SQLite (`better-sqlite3`)

## Quick Start

```bash
npm install
npm run dev
```

Then open your browser to `http://localhost:5173`.

To test multiplayer, open a second browser tab (or a second browser) to the same URL. Use a different player name.

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D | Move |
| Mouse | Look (click canvas to lock pointer) |
| Left Click | Fire |
| Right Click | Aim down sights |
| R | Reload |
| Shift | Sprint |
| Ctrl | Crouch |
| Space | Jump |
| E | Interact / loot / bank at Haven |
| F | Inventory / loot panel |
| B | Crafting bench |
| M | Map |
| 1-3 | Weapon / item slots |
| G | Grenade |
| V | Spawn / board / exit boat |
| Esc | Release pointer / close menus |
| F1 | Toggle debug overlay |

## Architecture

```
tidefall-dead-current/
  shared/      Shared types, items, weapons, recipes, locations, contracts, events
  server/      Authoritative multiplayer server and game simulation
  client/      Three.js renderer, input, UI, audio
  docs/        Design and networking docs
```

### Server Architecture

- `World.ts` runs the authoritative 20 Hz tick simulation.
- Entities: `PlayerEntity`, `AIEntity`, `BoatEntity`, `LootEntity`.
- Systems: `CombatSystem`, `InventorySystem`, `CraftingSystem`, `LootSystem`, `ContractSystem`, `AISystem`, `BoatSystem`, `PersistenceSystem`.
- Networking: WebSocket server sends 10 Hz interest-managed snapshots.
- Persistence: SQLite stores player profiles, stash, and statistics.

### Client Architecture

- `GameClient.ts` manages rendering loop, input, and server messages.
- `SceneBuilder.ts` builds the Three.js scene: ocean, islands, lighting, storm wall.
- `InputController.ts` captures keyboard/mouse using Pointer Lock API.
- UI modules: `menu.ts`, `hud.ts`, `inventory.ts`, `crafting.ts`, `map.ts`, `deathScreen.ts`, `notifications.ts`.
- Procedural textures and models generated in `render/textures.ts` and `render/models.ts`.

## Content

### Locations

- **The Haven** — safe harbor hub with stash, crafting, contracts, and boat dock
- **Driftwood Cay** — low-risk tropical starter island
- **Ironhook Fort** — medium-risk fortress with vault and captain mini-boss
- **Blackreef Shipyard** — medium/high-risk industrial zone with drones and turrets
- **Crown Battery** — high-risk military island with elite AI and heavy machine unit
- **Leviathan Wreck** — sea-based wreck dungeon with contraband

### Weapons

Rust Pistol, Compact SMG, Pump Shotgun, Scrap Rifle, Burst Carbine, Marksman Rifle, Bolt Rifle, Frag Grenade.

### Systems

- Authoritative server-side hitscan combat with recoil, spread, falloff, and headshot multipliers
- AI enemies with patrol/alert/attack states
- Loot containers, AI drops, and player death backpacks
- Boat travel with cargo inventory
- Crafting bench with recipes and blueprint unlocks
- Contract board with faction reputation rewards
- Signal Tower world event
- Safe zone / storm wall boundary
- SQLite persistence for stash and progression

## Developer Commands

Press `F1` in-game to toggle debug info. Additional dev commands can be sent via the in-game console (if bound) or by sending `devCommand` messages:

- `give` — give test crafting materials
- `respawn` — respawn at The Haven
- `tp_driftwood`, `tp_fort`, `tp_shipyard`, `tp_crown`, `tp_wreck` — teleport
- `kill_ai` — kill nearby AI

## Testing

```bash
npm run test
```

Tests cover inventory stacking, crafting validation, weapon damage, safe zone damage prevention, and AI damage.

## Known Limitations

- Procedural art is stylized/low-poly; no external assets are used.
- Networking is optimized for local/small-server testing first.
- Lag compensation is simplified (server uses current positions with basic validation).
- AI behavior is functional but not AAA-level; state machine is intentionally simple.
- Boat physics are simplified arcade-style movement.
- Map is a compact vertical slice, not a full production-sized world.
- Persistence uses SQLite for local development.
- Audio uses procedurally generated Web Audio placeholders.

## Future Scaling

- Zone/shard servers with Redis pub/sub for cross-zone state
- Matchmaking and crew system
- Player trading and player-run stalls
- Dedicated asset pipeline with external art/audio
- WebGPU renderer upgrade
- Server-side replay and anti-cheat
- Cloud database backend

## License

This is an original prototype created for demonstration purposes. No copyrighted names, assets, maps, weapons, logos, UI, characters, sounds, or protected visual identity from existing games are used.
