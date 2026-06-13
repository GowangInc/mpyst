import { SlideshowManager } from './game/Slideshow.js';
import { PuzzleManager } from './game/Puzzles.js';
import { audio } from './game/Audio.js';

// Setup elements
const loginOverlay = document.getElementById('login-overlay');
const joinBtn = document.getElementById('join-btn');
const playerNameInput = document.getElementById('player-name');
const gameHud = document.getElementById('game-hud');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const modeBadge = document.getElementById('player-mode-badge');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryBook = document.getElementById('victory-book-link');
const resetBtn = document.getElementById('reset-game-btn');

let selectedColor = '#ffd700'; // Default gold

// Expose variables globally so SlideshowManager can read them
window.playerNameInput = playerNameInput;
window.selectedColor = selectedColor;

// Initialize Socket.io client connection
const socket = io();

// 1. Color picker button event binding
document.querySelectorAll('.color-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    audio.playClick();
    
    // Clear selection
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    
    // Add selection
    btn.classList.add('selected');
    selectedColor = btn.dataset.color;
    window.selectedColor = selectedColor;
  });
});

// 2. Joining the game
joinBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Explorer';
  const mode = document.querySelector('input[name="game-mode"]:checked').value;

  // Initialize audio context on first user click gesture
  audio.init();
  audio.playClick();

  joinBtn.textContent = 'Loading Island...';
  joinBtn.disabled = true;

  // Join the server lobby room
  socket.emit('join', {
    name: name,
    color: selectedColor,
    mode: mode
  });

  // Setup local puzzle controller
  window.gamePuzzles = new PuzzleManager(socket, mode);

  // Set HUD mode badge display
  modeBadge.textContent = mode === 'coop' ? 'Co-op Sync' : 'Solo Mode';
  modeBadge.style.borderColor = mode === 'coop' ? '#d4af37' : '#3b82f6';
  modeBadge.style.color = mode === 'coop' ? '#d4af37' : '#3b82f6';

  // Instantiate Slideshow navigation engine
  window.gameEngine = new SlideshowManager(socket, mode);
  window.gameEngine.renderCurrentNode();

  // Hide login overlay, reveal game screen
  loginOverlay.classList.add('hidden');
  gameHud.classList.remove('hidden');
  
  window.gamePuzzles.showFeedback(`Welcome to mPyst, ${name}! Click edge arrows to navigate, and click screen objects to inspect them.`);
  window.gamePuzzles.showFeedback(`<strong>🔎 NEED CLUES?</strong> Walk up the steps from the Docks to enter the <strong>Library</strong>. Inspect the <strong>bookshelf</strong> or the <strong>red & blue book podiums</strong> to read the journals containing all combinations, codes, and patterns!`);

  // Monitor victory book reveal state
  setInterval(() => {
    if (window.gamePuzzles && window.gamePuzzles.state.mystBookRevealed && !window.victoryChimePlayed) {
      window.victoryChimePlayed = true;
      audio.playSuccess();
      
      // Auto-navigate to fireplace node close-up to see the open wall
      if (window.gameEngine) {
        window.gameEngine.navigateToNode('fireplace_node');
      }

      // Show victory overlay after a short delay
      setTimeout(() => {
        victoryOverlay.classList.remove('hidden');
      }, 1500);
    }
  }, 1000);
});

// 3. Chat form submission
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text) {
    socket.emit('chat_message', text);
    chatInput.value = '';
  }
});

// Sync incoming chat messages in DOM
socket.on('chat_received', (data) => {
  const msg = document.createElement('div');
  msg.className = 'chat-msg';
  msg.style.setProperty('--sender-color', data.color);
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'sender';
  nameSpan.textContent = `${data.sender}:`;
  
  const textSpan = document.createElement('span');
  textSpan.textContent = data.text;
  
  msg.appendChild(nameSpan);
  msg.appendChild(textSpan);
  
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Play subtle sound for new message if logged in
  if (loginOverlay.classList.contains('hidden')) {
    audio.playClick();
  }
});

// 4. Final Victory book interaction
victoryBook.addEventListener('click', () => {
  audio.playVictory();
  window.gamePuzzles.showFeedback("You touched the Myst Book! A linking portal opens...");
});

// 5. Reset Game state
resetBtn.addEventListener('click', () => {
  audio.playClick();
  
  // Hide overlays
  victoryOverlay.classList.add('hidden');
  window.victoryChimePlayed = false;
  
  // Send player back to docks starting point
  if (window.gameEngine) {
    window.gameEngine.navigateToNode('docks');
    window.gameEngine.closeActivePuzzle();
  }
  
  if (window.gamePuzzles) {
    // Reset global cooperative state on server (or client if solo)
    window.gamePuzzles.updateStateLocal({
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
    });
    
    // Reset fireplace grid locally
    window.gamePuzzles.fpPanels = Array(9).fill(false);
    document.querySelectorAll('.fire-plate').forEach(plate => plate.classList.remove('active'));
  }
});

// 6. Navigation overlay helper indicators (for mobile & visibility preference)
const toggleNav = document.getElementById('toggle-nav-indicators');
const navContainer = document.getElementById('nav-hotspots');
if (toggleNav && navContainer) {
  const savedPref = localStorage.getItem('mpyst_show_nav_indicators') === 'true';
  toggleNav.checked = savedPref;
  navContainer.classList.toggle('always-visible', savedPref);

  toggleNav.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    navContainer.classList.toggle('always-visible', isChecked);
    localStorage.setItem('mpyst_show_nav_indicators', isChecked);
    audio.playClick();
  });
}

