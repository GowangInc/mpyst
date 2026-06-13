# mPyst

A browser-based, multiplayer point-and-click puzzle adventure inspired by the classic game **Myst**. Students explore a pre-rendered island scene-by-scene, solve puzzles, and race or collaborate to unlock the final Myst Book.

Built for the classroom:
- **Competition mode** — classes race to solve all puzzles first with a live leaderboard.
- **Cooperative mode** — the whole class shares puzzle progress.
- **Solo Explorer mode** — students solve individually while still seeing and chatting with others.
- **Separate competitions** — create different codes for Year 7, Year 8, or any group so progress is isolated.
- **Persistent usernames & progress** — students can close their browser and pick up exactly where they left off.

---

## Features

- **Slideshow-style exploration** — Navigate a node-based graph of pre-rendered island scenes (Docks, Library, Clock Tower, Generator Cabin, Spaceship, and more).
- **Real-time multiplayer** — Socket.IO keeps every player's location, actions, and puzzle state in sync.
- **Competition, Cooperative, and Solo modes** — Choose whether students race, share progress, or solve independently.
- **Teacher admin panel** — Create competitions, monitor live progress, view leaderboards, and reset/delete sessions at `/admin`.
- **Persistent player tokens** — Progress and usernames are saved in SQLite so students can resume later.
- **Isolated competitions** — Each competition code is a separate room with its own leaderboard (up to 20 players each).
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
| Database | SQLite (better-sqlite3) |
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

Open the URL in one or more browser tabs to test multiplayer locally. The admin panel is at `http://localhost:3000/admin`.

### 3. Build for production

```bash
npm run build
```

This outputs a static bundle to `dist/`.

### 4. Run in production mode

```bash
NODE_ENV=production PORT=3000 npm start
```

The production server serves the files from `dist/`. Set the `PORT` environment variable to change the listening port:

```bash
PORT=8080 NODE_ENV=production npm start
```

### 5. Admin password

Set the admin password with an environment variable (default is `admin`):

```bash
MPYST_ADMIN_PASSWORD=your-secure-password npm start
```

---

## Teacher Workflow

1. Open `/admin` and log in with the admin password.
2. Click **Create Competition**, choose a code like `YEAR7A`, a display name, and a mode.
3. Share the competition code with your class.
4. Students enter the code on the main page, pick a name/color, and click **Enter Island**.
5. Watch live progress and the leaderboard from the admin panel.

Each competition is isolated, so `YEAR7A` and `YEAR8A` will have completely separate players and leaderboards.

---

## Project Structure

```
mpyst/
├── server.js              # Express + Socket.IO server, serves Vite in dev and dist/ in production
├── admin.html             # Teacher admin dashboard
├── index.html             # Main game page + all UI overlays
├── package.json           # Project metadata and scripts
├── vite.config.js         # Vite configuration
├── server/
│   └── db.js              # SQLite schema and helper functions
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

When a player joins they choose a name, avatar color, competition code, and mode. After entering the island, navigation is done by clicking edge arrows or clicking hotspots directly on the scene image.

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

### Competition (default)

- Each student races to solve the puzzles independently.
- Progress is persisted to the database and restored on reconnect.
- A live leaderboard shows who has solved the most puzzles.
- Up to 20 players per competition code.

### Cooperative

- Puzzle state is shared across all players in the competition.
- Solving one puzzle unlocks it for everyone.
- Players see who else is on the same scene.

### Solo Explorer

- Each player solves puzzles independently.
- Players can still see each other's locations and use the chat.
- Progress is still persisted so students can resume later.

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
