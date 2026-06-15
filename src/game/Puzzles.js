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
  },
  {
    left: "<h3>The Island Markers</h3><p>Scattered across the island are five marker switches left by the D'ni surveyors. When all are raised, they channel power to the Library Imager.</p><p>Search near the Docks, the Docks Path, the Library Entrance, the Cabin Path, and the Spaceship Path.</p>",
    right: "<h3>The Library Imager</h3><p>The Imager projects a recorded message when fed the correct date. Atrus left this clue in his journal:</p><p><strong>October 11, 1984</strong> — the day he first linked to Myst.</p><p>Enter the date as <strong>10.11.1984</strong> to see the message.</p>"
  },
  {
    left: "<h3>The Library Dome</h3><p>Above the Library rests a glass dome that opens to the night sky. Inside is an orrery and star chart left by Atrus.</p><p>Once the elevator is powered, ascend to the dome and trace the constellation of the Serpent across the chart.</p>",
    right: "<h3>The Serpent Constellation</h3><p>The Serpent winds across the sky in seven bright stars. Begin at its head in the upper left and follow its body down, then right, then down again.</p><p>Trace the stars in order to reveal the three-number Cabin Safe code: <strong>4 - 7 - 2</strong>.</p>"
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
      shrineSolved: false,
      cavernSolved: false,
      markerSwitches: { docks: false, docks_path: false, library_exterior: false, cabin_path: false, spaceship_path: false },
      markerSwitchesRaised: false,
      imagerInput: '',
      imagerSolved: false,
      starChartSolved: false,
      cabinSafeOpened: false,
      shipMarkersAligned: false,
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

    // Single shared valve drag state to avoid piling global mousemove listeners
    let valveDrag = null;

    const handleValveDelta = (type, dir) => {
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
    };

    const setupValveDrag = (element, type) => {
      element.addEventListener('mousedown', (e) => {
        valveDrag = { type, startY: e.clientY, element };
        element.style.cursor = 'grabbing';
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

    window.addEventListener('mousemove', (e) => {
      if (!valveDrag || !window.gameEngine || window.gameEngine.currentNodeId !== 'docks_valve_zoom') return;
      const deltaY = e.clientY - valveDrag.startY;
      if (Math.abs(deltaY) > 20) {
        const dir = deltaY > 0 ? -1 : 1;
        handleValveDelta(valveDrag.type, dir);
        valveDrag.startY = e.clientY;
      }
    });

    window.addEventListener('mouseup', () => {
      if (valveDrag) {
        valveDrag.element.style.cursor = 'grab';
        valveDrag = null;
      }
    });

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

    // Forest shrine pipe puzzle state (4x4 grid, 0-3 rotations)
    this.shrinePipes = Array(16).fill(0);
    // Crystal cavern mirror puzzle state (5x5 grid, -1=empty, 0-3 orientations for mirrors)
    this.cavernMirrors = Array(25).fill(-1);
    this.cavernBeams = Array(25).fill(false);
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

    // 5a. FOREST SHRINE AQUEDUCT
    const shrineGrid = document.getElementById('shrine-pipe-grid');
    if (shrineGrid) {
      const shrineSolution = [
        2, 1, 1, 3,
        2, 3, 2, 1,
        1, 2, 1, 2,
        3, 1, 2, 0
      ];
      shrineGrid.innerHTML = '';
      for (let i = 0; i < 16; i++) {
        const tile = document.createElement('div');
        tile.className = 'pipe-tile';
        tile.dataset.idx = i;
        tile.innerHTML = this.renderPipeTile(this.shrinePipes[i]);
        tile.addEventListener('click', () => {
          audio.playClick();
          this.shrinePipes[i] = (this.shrinePipes[i] + 1) % 4;
          tile.innerHTML = this.renderPipeTile(this.shrinePipes[i]);
        });
        shrineGrid.appendChild(tile);
      }
      document.getElementById('shrine-flow-btn').addEventListener('click', () => {
        audio.playClick();
        const solved = this.shrinePipes.every((v, i) => v === shrineSolution[i]);
        if (solved) {
          this.updateStateLocal({ shrineSolved: true });
          audio.playSuccess();
          this.showFeedback('Water rushes through the aqueduct! The stone door to the caverns grinds open.');
          document.querySelectorAll('.pipe-tile').forEach(t => t.classList.add('active'));
          setTimeout(() => {
            if (window.gameEngine) window.gameEngine.navigateToNode('forest_shrine');
            this.closeActivePuzzle();
          }, 1500);
        } else {
          audio.playBuzzer();
          this.showFeedback('The water spills out before reaching the wheel. Check the pipe angles.');
        }
      });
    }

    // 5b. CRYSTAL CAVERN MIRRORS
    const cavernGrid = document.getElementById('cavern-light-grid');
    if (cavernGrid) {
      const cavernLayout = [
        'E', 0, 0, 0, 0,
        0, 'M', 0, 'M', 0,
        0, 0, 'M', 0, 0,
        0, 'M', 0, 'M', 0,
        0, 0, 0, 0, 'R'
      ];
      const cavernSolution = [1, 2, 1, 2, 1]; // mirror orientations for the 5 mirrors
      this.cavernMirrors = cavernLayout.map(c => c === 'M' ? 0 : -1);
      cavernGrid.innerHTML = '';
      let mirrorIndex = 0;
      for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'light-cell';
        cell.dataset.idx = i;
        const type = cavernLayout[i];
        if (type === 'E') {
          cell.classList.add('emitter');
          cell.innerHTML = '<span style="font-size:1.4rem">☀️</span>';
        } else if (type === 'R') {
          cell.classList.add('receiver');
          cell.innerHTML = '<span style="font-size:1.4rem">💎</span>';
        } else if (type === 'M') {
          cell.classList.add('mirror');
          const idx = mirrorIndex++;
          cell.dataset.mirror = idx;
          cell.innerHTML = this.renderMirrorTile(this.cavernMirrors[i]);
          cell.addEventListener('click', () => {
            audio.playClick();
            this.cavernMirrors[i] = (this.cavernMirrors[i] + 1) % 4;
            cell.innerHTML = this.renderMirrorTile(this.cavernMirrors[i]);
            this.updateCavernBeams();
          });
        }
        cavernGrid.appendChild(cell);
      }
      document.getElementById('cavern-ignite-btn').addEventListener('click', () => {
        audio.playClick();
        this.updateCavernBeams();
        let mirrorIndex = 0;
        let solved = true;
        for (let i = 0; i < 25; i++) {
          if (cavernLayout[i] === 'M') {
            if (this.cavernMirrors[i] !== cavernSolution[mirrorIndex]) solved = false;
            mirrorIndex++;
          }
        }
        const receiverLit = this.cavernBeams[24];
        if (solved && receiverLit) {
          this.updateStateLocal({ cavernSolved: true });
          audio.playSuccess();
          this.showFeedback('The crystal receiver flares bright! A symbol etches itself into the cavern wall.');
          setTimeout(() => {
            if (window.gameEngine) window.gameEngine.navigateToNode('crystal_cavern');
            this.closeActivePuzzle();
          }, 1500);
        } else {
          audio.playBuzzer();
          this.showFeedback('The light refracts away. Adjust the mirror angles.');
        }
      });
    }

    this.updateCavernBeams();

    // 5c. LIBRARY IMAGER
    const imagerInput = document.getElementById('imager-input');
    const imagerSubmit = document.getElementById('imager-submit-btn');
    if (imagerSubmit) {
      imagerSubmit.addEventListener('click', () => {
        if (!this.state.markerSwitchesRaised) {
          audio.playBuzzer();
          this.showFeedback('The Imager is dark. The marker switches must be raised first.');
          return;
        }
        const value = imagerInput.value.trim();
        this.updateStateLocal({ imagerInput: value });
        if (value === '10.11.1984') {
          this.updateStateLocal({ imagerSolved: true });
          audio.playSuccess();
          this.showFeedback('The Imager flickers and projects a message: "The dome above the Library holds the Serpent constellation."');
        } else {
          audio.playBuzzer();
          this.showFeedback('Static crackles. The Imager does not recognize that date.');
        }
      });
    }

    // 5d. STAR CHART
    const starGrid = document.getElementById('star-chart-grid');
    if (starGrid) {
      const starSolution = [1, 7, 13, 14, 20, 26, 27];
      this.starOrder = [];
      starGrid.innerHTML = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'star-lines');
      svg.setAttribute('viewBox', '0 0 384 384');
      starGrid.appendChild(svg);
      for (let i = 0; i < 36; i++) {
        const cell = document.createElement('div');
        cell.className = 'star-cell';
        cell.dataset.idx = i;
        if (starSolution.includes(i)) {
          cell.classList.add('part-of-constellation');
        }
        cell.addEventListener('click', () => {
          if (this.state.starChartSolved) return;
          if (!this.state.imagerSolved) {
            this.showFeedback('The chart is unresponsive. The Imager must reveal the target constellation first.');
            return;
          }
          const expected = starSolution[this.starOrder.length];
          if (i === expected) {
            audio.playClick();
            this.starOrder.push(i);
            cell.classList.add('active');
            this.drawStarLines(starSolution, this.starOrder);
            if (this.starOrder.length === starSolution.length) {
              this.updateStateLocal({ starChartSolved: true });
              audio.playSuccess();
              this.showFeedback('The stars align! The Serpent constellation glows and reveals the Cabin Safe code: 4 - 7 - 2');
            }
          } else {
            audio.playBuzzer();
            this.starOrder = [];
            starGrid.querySelectorAll('.star-cell').forEach(c => c.classList.remove('active'));
            svg.innerHTML = '';
            this.showFeedback('The constellation breaks apart. Start again from the Serpent\'s head.');
          }
        });
        starGrid.appendChild(cell);
      }
      document.getElementById('star-chart-submit-btn').addEventListener('click', () => {
        if (this.state.starChartSolved) {
          this.showFeedback('The constellation is already traced. The code is 4 - 7 - 2.');
        } else {
          this.showFeedback('Click the stars in the correct order to trace the Serpent.');
        }
      });
    }

    // 5e. CABIN SAFE
    const safeDisplay = document.getElementById('safe-display');
    const safeContents = document.getElementById('safe-contents');
    if (safeDisplay) {
      this.safeCode = '';
      document.querySelectorAll('.safe-keypad button').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          if (key === 'C') {
            audio.playClick();
            this.safeCode = '';
            safeDisplay.textContent = '000';
          } else if (key === 'E') {
            audio.playClick();
            if (this.safeCode === '472') {
              this.updateStateLocal({ cabinSafeOpened: true });
              audio.playSuccess();
              safeContents.classList.remove('hidden');
              this.showFeedback('The safe clicks open! Inside is a note with a secret gear code.');
            } else {
              audio.playBuzzer();
              this.showFeedback('The safe beeps angrily. Wrong code.');
              this.safeCode = '';
              safeDisplay.textContent = '000';
            }
          } else if (this.safeCode.length < 3) {
            audio.playClick();
            this.safeCode += key;
            safeDisplay.textContent = this.safeCode.padStart(3, '0');
          }
        });
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
  openPuzzle(puzzleId, data = {}) {
    if (this.activePuzzleId) return;

    // Check if powered for spaceship
    if (puzzleId === 'puzzle-spaceship' && !this.state.generatorSolved) {
      this.showFeedback('The spaceship controls are dark. Power must be routed first.');
      return;
    }

    // Marker switch modal uses the same modal with dynamic ID
    if (puzzleId === 'puzzle-marker-switch') {
      this.openMarkerSwitch(data.switchId);
      return;
    }

    if (puzzleId === 'puzzle-imager' && !this.state.markerSwitchesRaised) {
      this.showFeedback('The Imager is dark and silent. Raise all marker switches to power it.');
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

  openMarkerSwitch(switchId) {
    if (!switchId) return;
    if (this.state.markerSwitches[switchId]) {
      this.showFeedback('This marker switch is already raised.');
      return;
    }
    audio.playClick();
    const next = { ...this.state.markerSwitches, [switchId]: true };
    const allRaised = Object.values(next).every(Boolean);
    this.updateStateLocal({ markerSwitches: next, markerSwitchesRaised: allRaised });
    if (allRaised) {
      audio.playSuccess();
      this.showFeedback('All five marker switches are raised. The Library Imager hums to life!');
    } else {
      const raised = Object.values(next).filter(Boolean).length;
      this.showFeedback(`Marker switch raised. ${raised} of 5 are active.`);
    }
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
    updateTask('task-shrine', this.state.shrineSolved);
    updateTask('task-cavern', this.state.cavernSolved);
    updateTask('task-imager', this.state.imagerSolved);
    updateTask('task-star-chart', this.state.starChartSolved);
    updateTask('task-cabin-safe', this.state.cabinSafeOpened);
    updateTask('task-fireplace', this.state.mystBookRevealed);

    // 8. Star Chart solved UI
    if (this.state.starChartSolved) {
      document.querySelectorAll('.star-cell').forEach(c => c.classList.add('active'));
    }

    // 9. Cabin Safe contents
    const safeContents = document.getElementById('safe-contents');
    if (safeContents && this.state.cabinSafeOpened) {
      safeContents.classList.remove('hidden');
    }

    // 7. Library Imager UI
    const imagerMessage = document.getElementById('imager-message');
    const imagerScreen = document.getElementById('imager-screen');
    if (imagerMessage && imagerScreen) {
      if (!this.state.markerSwitchesRaised) {
        imagerScreen.classList.remove('active');
        imagerMessage.classList.remove('visible', 'active');
        imagerMessage.textContent = '';
      } else if (this.state.imagerSolved) {
        imagerMessage.textContent = 'The Serpent constellation in the Library Dome reveals the Cabin Safe code: 4 - 7 - 2';
        imagerMessage.classList.add('active');
        imagerScreen.classList.add('active');
      } else {
        imagerScreen.classList.add('active');
        imagerMessage.textContent = 'Static...';
        imagerMessage.classList.add('visible');
      }
    }

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

  // SVG helpers for new puzzles
  renderPipeTile(rotation) {
    const pipes = [
      // 0: vertical
      '<svg viewBox="0 0 80 80"><path d="M40 0 V80" stroke="#8b7355" stroke-width="14" fill="none" stroke-linecap="round"/></svg>',
      // 1: horizontal
      '<svg viewBox="0 0 80 80"><path d="M0 40 H80" stroke="#8b7355" stroke-width="14" fill="none" stroke-linecap="round"/></svg>',
      // 2: L bend (top-left)
      '<svg viewBox="0 0 80 80"><path d="M40 0 V40 H80" stroke="#8b7355" stroke-width="14" fill="none" stroke-linecap="round"/></svg>',
      // 3: T junction
      '<svg viewBox="0 0 80 80"><path d="M40 0 V80 M0 40 H40" stroke="#8b7355" stroke-width="14" fill="none" stroke-linecap="round"/></svg>'
    ];
    return `<div style="transform: rotate(${rotation * 90}deg); width:100%; height:100%;">${pipes[rotation]}</div>`;
  }

  renderMirrorTile(rotation) {
    // slash or backslash mirror line
    const d = rotation % 2 === 0 ? 'M10 60 L60 10' : 'M10 10 L60 60';
    return `<svg viewBox="0 0 70 70"><path d="${d}" stroke="#a5b4fc" stroke-width="6" stroke-linecap="round"/><circle cx="35" cy="35" r="4" fill="#a5b4fc"/></svg>`;
  }

  drawStarLines(solution, order) {
    const svg = document.querySelector('#star-chart-grid svg');
    if (!svg || order.length < 2) return;
    svg.innerHTML = '';
    for (let i = 0; i < order.length - 1; i++) {
      const from = order[i];
      const to = order[i + 1];
      const x1 = (from % 6) * 68 + 34;
      const y1 = Math.floor(from / 6) * 68 + 34;
      const x2 = (to % 6) * 68 + 34;
      const y2 = Math.floor(to / 6) * 68 + 34;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      svg.appendChild(line);
    }
  }

  updateCavernBeams() {
    const cells = document.querySelectorAll('.light-cell');
    this.cavernBeams.fill(false);
    cells.forEach(c => c.classList.remove('beam'));

    // Trace from emitter (index 0) rightward across the grid, bouncing off mirrors.
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // right, down, left, up
    const layout = [
      'E', 0, 0, 0, 0,
      0, 'M', 0, 'M', 0,
      0, 0, 'M', 0, 0,
      0, 'M', 0, 'M', 0,
      0, 0, 0, 0, 'R'
    ];
    let r = 0, c = 0, d = 0;
    let safety = 0;
    while (safety++ < 30) {
      const idx = r * 5 + c;
      this.cavernBeams[idx] = true;
      const cell = document.querySelector(`.light-cell[data-idx="${idx}"]`);
      if (cell && layout[idx] !== 'E' && layout[idx] !== 'R') cell.classList.add('beam');
      if (layout[idx] === 'R') break;
      if (layout[idx] === 'M') {
        const orient = this.cavernMirrors[idx];
        // mirror orientations: even = /, odd = \
        if (orient % 2 === 0) {
          // / mirror: right(0)<->up(3), down(1)<->left(2)
          d = [3, 2, 1, 0][d];
        } else {
          // \ mirror: right(0)<->down(1), up(3)<->left(2)
          d = [1, 0, 3, 2][d];
        }
      }
      r += dirs[d][1];
      c += dirs[d][0];
      if (r < 0 || r >= 5 || c < 0 || c >= 5) break;
    }
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
