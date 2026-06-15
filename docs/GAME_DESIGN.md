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

## Proposed Future Myst Puzzles

These puzzles draw from the original *Myst* and are chosen to fit on the single island map.

### 8. Marker Switches *(planned)*
- **Locations:** small clickable levers hidden in existing scenes (Docks, Docks Path, Library Exterior, Cabin Path, Spaceship Path).
- **Mechanic:** all switches must be flipped to a raised position.
- **Reward:** powers the Library Imager so it can display a message or code.
- **Clue:** a journal note mentions "five markers raised in tribute."

### 9. Library Imager *(planned)*
- **Location:** inside the Library.
- **Mechanic:** enter a date or numeric code on a keypad/rotary dial.
- **Answer:** derived from journal clues (e.g., a date written by Atrus).
- **Reward:** displays a holographic message revealing the next clue or a teacher-configurable hint.
- **Teacher value:** lets teachers broadcast custom hints per competition.

### 10. Star Chart / Planetarium *(planned)*
- **Location:** new `library_dome` or `observatory` node, accessible from Library Exterior once elevator is powered.
- **Mechanic:** click stars to draw a constellation matching a journal drawing.
- **Reward:** outputs a 3-digit number for the Cabin Safe.

### 11. Cabin Safe *(planned)*
- **Location:** inside the Generator Cabin.
- **Mechanic:** dial or number-pad combination lock.
- **Answer:** comes from the Star Chart or Marker Switches.
- **Reward:** contains a journal page with the true Clock Tower gear code or a shortcut key.

### 12. Ship Marker Alignment *(planned)*
- **Location:** Docks or Spaceship Exterior.
- **Mechanic:** rotate three circular markers to match symbols found in the Red/Blue books.
- **Reward:** unlocks a hidden tunnel or reveals the final fireplace symbol.

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
- [ ] Marker switches raised → Library Imager online
- [ ] Star chart solved → Cabin safe code revealed
- [ ] Cabin safe opened → bonus journal page / shortcut
- [ ] Ship markers aligned → hidden tunnel or final symbol
