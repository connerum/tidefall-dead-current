# Networking Architecture

## Authority

The server is authoritative for all gameplay state:

- Player position (validated with speed caps)
- Damage and hit confirmation
- Inventory, stash, crafting
- Loot spawns and transfers
- AI simulation
- Boat state
- Contracts and world events

The client handles rendering, input, UI, and local audio/visual effects.

## Tick Rate

- Server simulation: 20 Hz
- Network snapshots: 10 Hz
- Client render: requestAnimationFrame

## Messages

### Client → Server

- `join` — authenticate
- `input` — movement, look, actions
- `fire` — weapon fire request with origin/direction
- `reload`, `interact`, `equip`, `craft`, `acceptContract`, `bank`, `withdraw`, `spawnBoat`, `boardBoat`, `exitBoat`, `lootTake`

### Server → Client

- `auth` — assigned player ID
- `snapshot` — world state visible to player
- `profile`, `inventory`, `boatCargo`, `lootOpen`
- `hitmarker`, `death`, `notification`, `craftingResult`, `contractUpdate`

## Interest Management

Snapshots include only entities within a radius of the receiving player. The player's own state is always included.

## Combat Validation

The server validates:

- Fire rate and ammo
- Plausible view direction
- Ray intersection against simplified capsule hitboxes
- Safe zone PvP rules
