# mPyst Expanded Island Design

## Overview
Single-map cooperative Myst-style island for students aged 12–17. Each "Age" is a themed zone hidden behind prerequisites so students must explore, find clues, and unlock new areas together.

## Island Layout (clockwise)

```
                    [Crystal Cavern]
                          ▲
                          │ (light beam solves)
        [Forest Shrine] ──┼── [Clock Tower] ── [Spaceship]
              │           │        │
        (water route)     │   (bridge raised)
              │           │        │
            [Docks] ──────┴── [Library] ───── [Generator Cabin]
```

## Zones & Prerequisites

### 1. The Docks
- **Theme:** Arrival beach, Romanesque clock pillar.
- **Puzzle:** Clock valve pillar (set hour/minute hands).
- **Answer:** 2:40 (from library journal).
- **Unlocks:** Bridge rises to Clock Tower and Forest Shrine path.

### 2. Clock Tower
- **Theme:** Mechanical gears, brass, stone.
- **Puzzle:** Three-digit gear combination lock.
- **Answer:** 2-2-1 (from library journal).
- **Unlocks:** Library elevator / power routing.

### 3. Generator Cabin
- **Theme:** Industrial switchboard, sparks, meters.
- **Puzzle:** Toggle switches to sum exactly 59V.
- **Answer:** switches whose prime values sum to 59.
- **Unlocks:** Spaceship door and forest shrine pump.

### 4. Spaceship
- **Theme:** Sci-fi audio console, piano keys, sliders.
- **Puzzle:** Set 5 sliders to match a 5-note melody.
- **Answer:** D-F-A-G-C5 (from library journal).
- **Unlocks:** Fireplace medallion slot.

### 5. Library
- **Theme:** Scholarly, books, fireplace.
- **Puzzle:** 3×3 fireplace plate grid (hollow square).
- **Requires:** elevatorPowered && spaceshipSolved
- **Answer:** all outer plates active, center off.
- **Unlocks:** Myst book revealed (victory).

### 6. Forest Shrine *(new)*
- **Theme:** Overgrown stone, water channels, moss.
- **Prerequisite:** generatorSolved (pump activated).
- **Puzzle:** Rotate pipe tiles to route water from spring to water wheel.
- **Answer:** fully connected path from source to wheel.
- **Unlocks:** Crystal Cavern entrance and a journal page with a light-refraction clue.

### 7. Crystal Cavern *(new)*
- **Theme:** Glowing crystals, mirrors, darkness.
- **Prerequisite:** shrineSolved.
- **Puzzle:** Rotate mirrors to bounce a light beam onto a receiver crystal.
- **Answer:** correct mirror orientations.
- **Reward:** reveals a hidden symbol combination required for one of the existing locks (e.g., overwrites the Clock Tower gear answer or unlocks a bonus teacher-configurable safe).

## Clue System

1. **Library Journal** — 4 pages with one clue per existing puzzle.
2. **Forest Journal Page** — found after solving generator; gives the water-pipe target layout hint.
3. **Cavern Symbol Tablet** — appears after shrine solved; gives a visual clue for the mirror target angle.
4. **Teacher-configurable answers** — admin can override any puzzle answer per competition so classes cannot share answers across sessions.

## Co-op Mechanics

- All zone states are shared in co-op mode.
- New puzzles broadcast `puzzle_update` to the room.
- Some future puzzles may require students at different stations simultaneously (out of scope for this phase).

## Progress Checklist

- [ ] Docks clock solved → bridge raised
- [ ] Clock tower gears solved → elevator powered
- [ ] Generator solved → spaceship + shrine pump online
- [ ] Spaceship audio solved → fireplace medallion ready
- [ ] Forest shrine solved → cavern opens
- [ ] Crystal cavern solved → bonus symbol clue
- [ ] Library fireplace solved → Myst book revealed
