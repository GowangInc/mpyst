# mPyst

A browser-based, cooperative multiplayer point-and-click puzzle adventure inspired by the classic game **Myst**. Players explore a pre-rendered island scene-by-scene, solve shared (or solo) puzzles, and communicate through an in-game chat to unlock the final Myst Book.

Built for the classroom: students can drop into the same island session, work together in **Cooperative** mode where puzzle progress is shared, or play at their own pace in **Solo Explorer** mode while still seeing and chatting with others.

---

## Features

- **Slideshow-style exploration** — Navigate a node-based graph of pre-rendered island scenes (Docks, Library, Clock Tower, Generator Cabin, Spaceship, and more).
- **Real-time multiplayer** — Socket.IO keeps every player's location, actions, and puzzle state in sync.
- **Cooperative vs Solo modes** — Choose whether puzzle progress is shared across all players or solved independently.
- **Five interlocking puzzles** — Clock valve, clock-tower gear lock, voltage switchboard, spaceship pitch/piano console, and a 3×3 fireplace grid.
- **In-world clue system** — A journal in the Library contains the combinations and formulas needed to advance.
- **Live chat HUD** — Players can coordinate, ask for help, or receive system feedback.
- **Synthesized audio** — All UI sounds, musical notes, success jingles, and victory music are generated with the Web Audio API; no external audio files required.
- **Vite front-end tooling** — Fast dev builds with HMR.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ |
| Server | Express + native `http` server |
| Real-time | Socket.IO |
| Front-end | Vanilla ES modules, HTML5, CSS3 |
| Build tool | Vite |
| Audio | Web Audio API (synthesized) |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Run the development server

```bash
npm run dev
```

The server starts on `http://localhost:3000` by default.

Open the URL in one or more browser tabs to test multiplayer locally.

### 3. Build for production

```bash
npm run build
```

This outputs a static bundle to `dist/`.

### 4. Run in production mode

```bash
NODE_ENV=production npm start
```

The production server serves the files from `dist/`. Set the `PORT` environment variable to change the listening port:

```bash
PORT=8080 NODE_ENV=production npm start
```

---

## Project Structure

```
mpyst/
├── server.js              # Express + Socket.IO server, serves Vite in dev and dist/ in production
├── index.html             # Main page + all UI overlays
├── package.json           # Project metadata and scripts
├── vite.config.js         # Vite configuration
├── public/
│   └── assets/            # Pre-rendered scene PNGs (island slideshow images)
├── src/
│   ├── main.js            # App entry point; login, chat, socket wiring, HUD toggles
│   ├── style.css          # Island / Myst-inspired styling
│   └── game/
│       ├── Nodes.js       # Scene graph: nodes, links, hotspots, navigation conditions
│       ├── Slideshow.js   # Scene renderer, arrow/hotspot rendering, player presence
│       ├── Puzzles.js     # Puzzle state, interactions, solution checks, socket sync
│       └── Audio.js       # Web Audio synthesizer for clicks, notes, gears, success, victory
```

---

## Gameplay & Puzzles

When a player joins they choose a name, avatar color, and mode. After entering the island, navigation is done by clicking edge arrows or clicking hotspots directly on the scene image.

### Puzzle Progression

1. **Docks Clock Valve** — Set the clock tower time to raise the bridge.
2. **Clock Tower Gears** — Enter the correct 3-digit gear combination to power the library elevator.
3. **Generator Cabin** — Toggle voltage switches to route exactly **59V** to the spaceship.
4. **Spaceship Console** — Match the 5-note melody using the vertical pitch sliders.
5. **Library Fireplace** — Toggle the 3×3 metal plate grid into the correct hollow-square pattern to reveal the Myst Book.

### Where to Find the Clues

All combinations and formulas are written in the **Library journal**. From the Docks, walk forward to the path, turn left up the steps, enter the Library, and inspect the **bookshelf** to read the journal pages.

The **Red Book** and **Blue Book** podiums in the Library also provide narrative context from Sirrus and Achenar.

> ⚠️ **Spoiler alert**: the full puzzle solutions are listed below.

### Puzzle Solutions

| Puzzle | Solution |
|--------|----------|
| Clock valve | Set the time to **2:40**, then press Confirm. |
| Clock tower gears | Set the digits to **2 - 2 - 1**, then pull the lever. |
| Generator | Toggle switches that sum to exactly **59V** without exceeding it. |
| Spaceship melody | Set sliders to the notes **D - F - A - G - C5**. |
| Fireplace grid | Toggle every plate **except** the center plate to form a hollow square. |

The final Myst Book only appears after the gear lock, generator, spaceship melody, and fireplace pattern are all solved.

---

## Multiplayer Modes

### Cooperative (default)

- Puzzle state is stored on the server and broadcast to all connected players.
- Solving one puzzle unlocks it for everyone.
- Players see who else is on the same scene.

### Solo Explorer

- Each player solves puzzles independently on the client.
- Players can still see each other's locations and use the chat.
- Use this mode if you want every student to experience the full puzzle sequence on their own.

---

## Development Notes

- **Hotspots** are defined as percentage-based bounding boxes in `src/game/Nodes.js`, making them easy to reposition if the artwork changes.
- **Dynamic images**: nodes can define a static `image` path or a `getImage(state)` function, e.g. the Docks path shows the raised bridge only after the clock valve is solved.
- **Audio context**: the Web Audio context is initialized on the first user click to satisfy browser autoplay policies.
- **No external asset licenses**: the included PNGs are placeholder/scratch artwork for development. Replace them with your own rendered scenes before distributing.

---

## Deployment

Because the app bundles a Socket.IO server, deploy it to any Node.js host (e.g. Railway, Render, Fly.io, a VPS).

A typical production deploy looks like:

```bash
npm ci
npm run build
NODE_ENV=production PORT=3000 npm start
```

Make sure the host exposes the port and that WebSocket traffic is allowed.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite + Express development server |
| `npm run build` | Build a production bundle into `dist/` |
| `npm start` | Start the production server (requires `dist/`) |

---

## License

MIT

---

## Credits

Created as a classroom multiplayer Myst-style experience. Fonts:

- [Cinzel](https://fonts.google.com/specimen/Cinzel) — titles and lore text
- [Outfit](https://fonts.google.com/specimen/Outfit) — UI body text
