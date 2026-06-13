import { audio } from './Audio.js';

// Voltage switch configurations (values for the 10 toggles)
const VOLTAGE_VALUES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];

// Note frequencies map for spaceship piano
const NOTE_FREQS = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25
};
// List of notes ordered by pitch index (0 to 12)
const SEMITONE_NOTES = [
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'
];

// Content for Library Books
const BOOK_PAGES = [
  {
    left: "<h3>The Island of Myst</h3><p>To whoever finds this journal: My name is Atrus. I have spent my life writing descriptive Books that link to other Worlds, called Ages.</p><p>My sons, Sirrus and Achenar, have burned many of my books. I am now trapped in a chamber, and they are imprisoned in their respective Books in the Library. Beware their words.</p>",
    right: "<h3>The Docks Clue</h3><p>The Clock Tower holds the mechanical linkages. To gain entry, you must look to the Docks.</p><p>Near the Docks rests a valve pillar. Set the time on the clock tower to: <strong>hour II</strong> and <strong>minutes XL</strong>.</p><p>This will raise the bridge from the seabed.</p>"
  },
  {
    left: "<h3>The Clock Tower Lock</h3><p>Inside the Clock Tower, the mechanical age machinery is locked with a combination.</p><p>You must adjust the three gears using the dials. The correct sequence of digits is <strong>2 - 2 - 1</strong>.</p><p>Pulling the lever with this combination will complete the gear linkage to power the library elevator.</p>",
    right: "<h3>The Generator Cabin</h3><p>The spaceship requires full electrical power to activate the frequency engines.</p><p>In the power cabin, use the switchboard to route exactly <strong>59 Volts</strong> of energy. Toggling switches adds their labeled voltage.</p><p>Danger: exceeding 59V trips the breaker! Be precise.</p>"
  },
  {
    left: "<h3>The Spaceship Piano</h3><p>The frequency locks on the ship are sound-based. Ensure the generator cabin routes power first.</p><p>Replicate the 5-note speaker chime using the sliders. The target melody sequence is: <strong>D - F - A - G - C5</strong>.</p><p>Set the pitches on the console sliders to match this melody to reveal the medallion.</p>",
    right: "<h3>The Library Fireplace</h3><p>A secret passage is hidden behind the stone wall of the library fireplace. The fireplace backplate moves once the gear system is active.</p><p>On the back wall panel, click the metal plates to toggle the 3x3 grid. The passcode pattern represents a <strong>hollow metal frame</strong> (hollow square).</p>"
  }
];

export class PuzzleManager {
  constructor(socket, mode) {
    this.socket = socket;
    this.mode = mode; // 'coop' or 'solo'
    
    // Local copy of states
    this.state = {
      clockHours: 12,
      clockMinutes: 0,
      bridgeRaised: false,
      towerGears: { d1: 1, d2: 1, d3: 1 },
      elevatorPowered: false,
      voltageSwitches: Array(10).fill(false),
      generatorVoltage: 0,
      generatorSolved: false,
      spaceshipSliders: [0, 0, 0, 0, 0],
      spaceshipSolved: false,
      mystBookRevealed: false
    };

    this.activePuzzleId = null;
    this.bookPageIndex = 0;

    this.setupSocketListeners();
    this.setupUIListeners();
  }

  setupSocketListeners() {
    // Sync incoming state from server (used in coop, competition, and solo modes)
    this.socket.on('puzzle_state', (srvState) => {
      this.state = { ...this.state, ...srvState };
      // In competition/solo modes the server also restores the player's saved progress.
      this.updatePuzzlesUI();
    });

    this.socket.on('puzzle_update', (srvState) => {
      this.state = { ...this.state, ...srvState };
      this.updatePuzzlesUI();
    });
  }

  setupUIListeners() {
    // General close button handler
    document.querySelectorAll('.close-puzzle-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeActivePuzzle());
    });

    // 1. CLOCK VALVE DIALS
    const hValve = document.getElementById('hours-valve');
    const mValve = document.getElementById('minutes-valve');
    const clockSubmit = document.getElementById('clock-submit-btn');

    let isValveDragging = false;
    let startY = 0;

    const setupValveDrag = (element, type) => {
      element.addEventListener('mousedown', (e) => {
        isValveDragging = true;
        startY = e.clientY;
        element.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isValveDragging || !window.gameEngine || window.gameEngine.currentNodeId !== 'docks_valve_zoom') return;
        const deltaY = e.clientY - startY;
        if (Math.abs(deltaY) > 20) {
          // Increment or decrement based on direction
          const dir = deltaY > 0 ? -1 : 1;
          audio.playGearGrind();
          
          if (type === 'hours') {
            let h = this.state.clockHours + dir;
            if (h > 12) h = 1;
            if (h < 1) h = 12;
            this.updateStateLocal({ clockHours: h });
          } else {
            let m = this.state.clockMinutes + dir * 5;
            if (m >= 60) m = 0;
            if (m < 0) m = 55;
            this.updateStateLocal({ clockMinutes: m });
          }
          
          startY = e.clientY;
        }
      });

      window.addEventListener('mouseup', () => {
        isValveDragging = false;
        element.style.cursor = 'grab';
      });

      // Bind click event for direct tap interaction
      element.addEventListener('click', () => {
        audio.playGearGrind();
        if (type === 'hours') {
          let h = this.state.clockHours + 1;
          if (h > 12) h = 1;
          this.updateStateLocal({ clockHours: h });
        } else {
          let m = this.state.clockMinutes + 5;
          if (m >= 60) m = 0;
          this.updateStateLocal({ clockMinutes: m });
        }
      });
    };

    setupValveDrag(hValve, 'hours');
    setupValveDrag(mValve, 'minutes');

    clockSubmit.addEventListener('click', () => {
      audio.playClick();
      // Solve condition: 2:40
      if (this.state.clockHours === 2 && this.state.clockMinutes === 40) {
        this.updateStateLocal({ bridgeRaised: true });
        audio.playSuccess();
        this.showFeedback('The clock tower gears turn... A bridge rises out of the water!');
      } else {
        this.showFeedback('The clock hands click, but nothing happens.');
      }
      if (window.gameEngine) window.gameEngine.navigateToNode('docks_path');
    });

    // 2. CLOCK GEAR LOCK
    document.querySelectorAll('.gear-combo-box button.arrow-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const wheel = e.target.dataset.wheel;
        audio.playClick();
        const gears = { ...this.state.towerGears };
        gears[wheel] = gears[wheel] === 9 ? 1 : gears[wheel] + 1;
        this.updateStateLocal({ towerGears: gears });
      });
    });

    document.querySelectorAll('.gear-combo-box button.arrow-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const wheel = e.target.dataset.wheel;
        audio.playClick();
        const gears = { ...this.state.towerGears };
        gears[wheel] = gears[wheel] === 1 ? 9 : gears[wheel] - 1;
        this.updateStateLocal({ towerGears: gears });
      });
    });

    const gearLever = document.getElementById('gear-lever');
    gearLever.addEventListener('click', () => {
      if (gearLever.classList.contains('pulled')) return;
      
      gearLever.classList.add('pulled');
      audio.playGearGrind();

      setTimeout(() => {
        const gears = this.state.towerGears;
        // Solve condition: 2 - 2 - 1
        if (gears.d1 === 2 && gears.d2 === 2 && gears.d3 === 1) {
          this.updateStateLocal({ elevatorPowered: true });
          audio.playSuccess();
          this.showFeedback('Clank! Gear teeth engage. The library elevator is now powered!');
          setTimeout(() => {
            if (window.gameEngine) window.gameEngine.navigateToNode('clock_tower_exterior');
          }, 1200);
        } else {
          audio.playBuzzer();
          this.showFeedback('Grrrind... The lever slips. Incorrect combination.');
          setTimeout(() => {
            gearLever.classList.remove('pulled');
          }, 800);
        }
      }, 600);
    });

    // 3. GENERATOR SWITCHBOARD
    const switchesGrid = document.querySelector('.switches-grid');
    // Generate switches
    switchesGrid.innerHTML = '';
    VOLTAGE_VALUES.forEach((v, idx) => {
      const cont = document.createElement('div');
      cont.className = 'power-switch-container';
      
      const sw = document.createElement('div');
      sw.className = 'power-switch';
      sw.dataset.idx = idx;
      
      const label = document.createElement('span');
      label.className = 'voltage-label';
      label.textContent = `${v}V`;
      
      cont.appendChild(sw);
      cont.appendChild(label);
      switchesGrid.appendChild(cont);
      
      sw.addEventListener('click', () => {
        if (this.state.generatorSolved) return;
        audio.playClick();
        
        const nextSwitches = [...this.state.voltageSwitches];
        nextSwitches[idx] = !nextSwitches[idx];
        
        // Calculate new voltage
        let total = 0;
        nextSwitches.forEach((active, index) => {
          if (active) total += VOLTAGE_VALUES[index];
        });

        if (total > 59) {
          // Trip breaker
          audio.playBuzzer();
          this.showFeedback('OVERLOAD! The generator breaker tripped.');
          this.updateStateLocal({
            voltageSwitches: Array(10).fill(false),
            generatorVoltage: 0
          });
          document.getElementById('reset-voltage-btn').classList.remove('hidden');
        } else if (total === 59) {
          this.updateStateLocal({
            voltageSwitches: nextSwitches,
            generatorVoltage: total,
            generatorSolved: true
          });
          audio.playSuccess();
          this.showFeedback('Green lights hum to life! The spaceship power line is energized!');
          setTimeout(() => {
            if (window.gameEngine) window.gameEngine.navigateToNode('cabin_exterior');
          }, 1500);
        } else {
          this.updateStateLocal({
            voltageSwitches: nextSwitches,
            generatorVoltage: total
          });
        }
      });
    });

    document.getElementById('reset-voltage-btn').addEventListener('click', (e) => {
      audio.playClick();
      e.target.classList.add('hidden');
    });

    // 4. SPACESHIP PIANO & SLIDERS
    const pianoKeys = document.querySelectorAll('#piano-keyboard .piano-key');
    pianoKeys.forEach(key => {
      key.addEventListener('mousedown', () => {
        const note = key.dataset.note;
        if (NOTE_FREQS[note]) {
          audio.playNote(NOTE_FREQS[note], 0.6);
          key.classList.add('active');
        }
      });
      key.addEventListener('mouseup', () => key.classList.remove('active'));
      key.addEventListener('mouseleave', () => key.classList.remove('active'));
    });

    const pitchSliders = document.querySelectorAll('.pitch-slider');
    pitchSliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        if (!this.state.generatorSolved) {
          slider.value = 0;
          return;
        }
        const idx = parseInt(e.target.dataset.idx);
        const val = parseInt(e.target.value);
        
        // Play corresponding semitone note
        const note = SEMITONE_NOTES[val];
        audio.playNote(NOTE_FREQS[note], 0.5);

        const sliders = [...this.state.spaceshipSliders];
        sliders[idx] = val;
        
        // Solve check: D4-F4-A4-G4-C5 => semitones [2, 5, 9, 7, 12]
        const target = [2, 5, 9, 7, 12];
        const isSolved = sliders.every((v, i) => v === target[i]);

        if (isSolved) {
          this.updateStateLocal({
            spaceshipSliders: sliders,
            spaceshipSolved: true
          });
          audio.playSuccess();
          this.showFeedback('A chime resonates. The console opens, revealing the fireplace grid page!');
          setTimeout(() => {
            if (window.gameEngine) window.gameEngine.navigateToNode('spaceship_exterior');
          }, 1800);
        } else {
          this.updateStateLocal({ spaceshipSliders: sliders });
        }
      });
    });

    document.getElementById('play-clue-btn').addEventListener('click', () => {
      audio.playClick();
      // Play target notes: D4, F4, A4, G4, C5
      const notes = ['D4', 'F4', 'A4', 'G4', 'C5'];
      notes.forEach((n, idx) => {
        setTimeout(() => {
          audio.playNote(NOTE_FREQS[n], 0.6);
          // light up piano keys visually
          const key = document.querySelector(`.piano-key[data-note="${n}"]`);
          if (key) {
            key.classList.add('active');
            setTimeout(() => key.classList.remove('active'), 400);
          }
        }, idx * 700);
      });
    });

    // 5. LIBRARY FIREPLACE GRID (3x3)
    const fpGrid = document.getElementById('fireplace-plate-grid');
    fpGrid.innerHTML = '';
    // Store states of 9 panels locally
    this.fpPanels = Array(9).fill(false);
    for (let i = 0; i < 9; i++) {
      const plate = document.createElement('div');
      plate.className = 'fire-plate';
      plate.dataset.idx = i;
      fpGrid.appendChild(plate);

      plate.addEventListener('click', () => {
        audio.playClick();
        this.fpPanels[i] = !this.fpPanels[i];
        plate.classList.toggle('active', this.fpPanels[i]);
      });
    }

    document.getElementById('fireplace-enter-btn').addEventListener('click', () => {
      audio.playClick();
      // Solve check: Hollow square pattern (all active except center index 4)
      // Index: 0,1,2, 3,4,5, 6,7,8
      const target = [true, true, true, true, false, true, true, true, true];
      const isSolved = this.fpPanels.every((val, idx) => val === target[idx]);

      if (isSolved && this.state.elevatorPowered && this.state.spaceshipSolved) {
        this.updateStateLocal({ mystBookRevealed: true });
        audio.playSuccess();
        this.showFeedback('Grind... The metal panels slide away and the fireplace fireplace backplate lifts, revealing the Myst Book!');
        setTimeout(() => {
          if (window.gameEngine) window.gameEngine.navigateToNode('library_interior');
        }, 1500);
      } else if (!this.state.elevatorPowered || !this.state.spaceshipSolved) {
        this.showFeedback('Nothing happens. The gear elevator power or spaceship link seems incomplete.');
      } else {
        this.showFeedback('Click. The pattern is incorrect.');
        // Shake plates
        fpGrid.style.transform = 'translateX(5px)';
        setTimeout(() => fpGrid.style.transform = 'translateX(-5px)', 100);
        setTimeout(() => fpGrid.style.transform = 'translateX(0)', 200);
      }
    });

    // 6. BOOK VIEWER NAV
    document.getElementById('prev-page-btn').addEventListener('click', () => {
      if (this.bookPageIndex > 0) {
        audio.playGearGrind();
        this.bookPageIndex--;
        this.renderBookPage();
      }
    });

    document.getElementById('next-page-btn').addEventListener('click', () => {
      if (this.bookPageIndex < BOOK_PAGES.length - 1) {
        audio.playGearGrind();
        this.bookPageIndex++;
        this.renderBookPage();
      }
    });
  }

  // Opens a specific puzzle overlay modal
  openPuzzle(puzzleId) {
    if (this.activePuzzleId) return;

    // Check if powered for spaceship
    if (puzzleId === 'puzzle-spaceship' && !this.state.generatorSolved) {
      this.showFeedback('The spaceship controls are dark. Power must be routed first.');
      return;
    }

    audio.playClick();
    this.activePuzzleId = puzzleId;
    
    const modal = document.getElementById(puzzleId);
    if (modal) {
      modal.classList.remove('hidden');
    }

    // Special initializations
    if (puzzleId === 'puzzle-book') {
      this.bookPageIndex = 0;
      this.renderBookPage();
    }

    this.updatePuzzlesUI();
  }

  closeActivePuzzle() {
    if (!this.activePuzzleId) return;
    
    audio.playClick();
    const modal = document.getElementById(this.activePuzzleId);
    if (modal) {
      modal.classList.add('hidden');
    }
    this.activePuzzleId = null;
  }

  // Updates the HTML representation of all puzzles based on state
  updatePuzzlesUI() {
    // 1. Clock valve time UI
    const digitalTime = document.getElementById('digital-time');
    const h = this.state.clockHours.toString().padStart(2, '0');
    const m = this.state.clockMinutes.toString().padStart(2, '0');
    if (digitalTime) digitalTime.textContent = `${h}:${m}`;

    const hHand = document.getElementById('hud-hour-hand');
    const mHand = document.getElementById('hud-minute-hand');
    if (hHand && mHand) {
      const hAngle = (this.state.clockHours + this.state.clockMinutes / 60) * 30; // 360 / 12 = 30 deg/hour
      const mAngle = this.state.clockMinutes * 6; // 360 / 60 = 6 deg/min
      hHand.style.transform = `translateX(-50%) rotate(${hAngle}deg)`;
      mHand.style.transform = `translateX(-50%) rotate(${mAngle}deg)`;
    }

    // 2. Clock gears combo lock UI
    const d1 = document.getElementById('gear-d1');
    const d2 = document.getElementById('gear-d2');
    const d3 = document.getElementById('gear-d3');
    if (d1) d1.textContent = this.state.towerGears.d1;
    if (d2) d2.textContent = this.state.towerGears.d2;
    if (d3) d3.textContent = this.state.towerGears.d3;

    // 3. Generator Voltage switches UI
    document.querySelectorAll('.power-switch').forEach((sw) => {
      const idx = parseInt(sw.dataset.idx);
      sw.classList.toggle('active', this.state.voltageSwitches[idx]);
    });

    const vReadout = document.getElementById('voltage-value');
    if (vReadout) vReadout.textContent = this.state.generatorVoltage;

    const vNeedle = document.getElementById('voltage-needle');
    if (vNeedle) {
      // Map 0-59V to -90deg to +90deg (or slightly less, e.g. -75deg to +75deg)
      const maxVal = 65; // cap meter slightly above 59
      const percent = Math.min(this.state.generatorVoltage / maxVal, 1.1);
      const angle = -90 + percent * 180;
      vNeedle.style.transform = `translateX(-50%) rotate(${angle}deg)`;
    }

    // 4. Spaceship piano power & sliders UI
    const pPower = document.getElementById('piano-power-status');
    if (pPower) {
      if (this.state.generatorSolved) {
        pPower.textContent = 'ONLINE';
        pPower.className = 'status-online';
      } else {
        pPower.textContent = 'OFFLINE';
        pPower.className = 'status-offline';
      }
    }

    document.querySelectorAll('.pitch-slider').forEach((slider) => {
      const idx = parseInt(slider.dataset.idx);
      slider.value = this.state.spaceshipSliders[idx];
      slider.disabled = !this.state.generatorSolved;
    });

    // 5. Fireplace grid
    document.querySelectorAll('.fire-plate').forEach((plate) => {
      const idx = parseInt(plate.dataset.idx);
      plate.classList.toggle('active', this.fpPanels[idx]);
    });

    // 6. HUD Checklist Task Items
    const updateTask = (id, complete) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('completed', complete);
    };
    updateTask('task-bridge', this.state.bridgeRaised);
    updateTask('task-gears', this.state.elevatorPowered);
    updateTask('task-generator', this.state.generatorSolved);
    updateTask('task-piano', this.state.spaceshipSolved);
    updateTask('task-fireplace', this.state.mystBookRevealed);

    // If final book is revealed, play victory chime once
    if (this.state.mystBookRevealed && !this.victoryShown) {
      // Show link to open final book
    }
  }

  // Renders the current pages of the book viewer
  renderBookPage() {
    const leftEl = document.getElementById('book-page-left');
    const rightEl = document.getElementById('book-page-right');
    const pageData = BOOK_PAGES[this.bookPageIndex];

    if (leftEl && rightEl && pageData) {
      leftEl.innerHTML = pageData.left;
      rightEl.innerHTML = pageData.right;
    }

    // Toggle button visibility
    document.getElementById('prev-page-btn').style.visibility = this.bookPageIndex === 0 ? 'hidden' : 'visible';
    document.getElementById('next-page-btn').style.visibility = this.bookPageIndex === BOOK_PAGES.length - 1 ? 'hidden' : 'visible';
  }

  // Updates state locally, evaluates solutions, and pushes to server for persistence/broadcast.
  updateStateLocal(update) {
    this.state = { ...this.state, ...update };

    // Evaluate any automatic solutions locally (client-side authoritative for puzzle logic).
    if (this.state.clockHours === 2 && this.state.clockMinutes === 40 && !this.state.bridgeRaised) {
      this.state.bridgeRaised = true;
      audio.playSuccess();
    }

    this.updatePuzzlesUI();

    // Always send the update to the server. In coop the server broadcasts to the room;
    // in competition/solo the server persists the player's individual progress.
    this.socket.emit('puzzle_interaction', this.state);
  }

  // Shows a popup message in the chat/feed
  showFeedback(text) {
    const chatContent = document.getElementById('chat-messages');
    if (chatContent) {
      const msg = document.createElement('div');
      msg.className = 'chat-msg';
      msg.innerHTML = `<span style="color:#d4af37;font-weight:600;">[SYSTEM]</span> <span style="font-style:italic;color:#e5e7eb;">${text}</span>`;
      chatContent.appendChild(msg);
      chatContent.scrollTop = chatContent.scrollHeight;
    }
  }
}
