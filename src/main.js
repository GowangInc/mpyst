import { SlideshowManager } from './game/Slideshow.js';
import { PuzzleManager } from './game/Puzzles.js';
import { audio } from './game/Audio.js';

// Setup elements
const loginOverlay = document.getElementById('login-overlay');
const joinBtn = document.getElementById('join-btn');
const playerNameInput = document.getElementById('player-name');
const competitionCodeInput = document.getElementById('competition-code');
const gameHud = document.getElementById('game-hud');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');
const modeBadge = document.getElementById('player-mode-badge');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryBook = document.getElementById('victory-book-link');
const resetBtn = document.getElementById('reset-game-btn');
const leaderboardPanel = document.getElementById('leaderboard-panel');
const leaderboardList = document.getElementById('leaderboard-list');

let selectedColor = '#ffd700'; // Default gold
let playerToken = localStorage.getItem('mpyst_player_token') || '';
let savedName = localStorage.getItem('mpyst_player_name') || '';
let savedCode = localStorage.getItem('mpyst_competition_code') || '';
let savedMode = localStorage.getItem('mpyst_game_mode') || 'competition';

// Restore form fields
if (savedName) playerNameInput.value = savedName;
if (savedCode) competitionCodeInput.value = savedCode;
if (savedMode) {
  const modeRadio = document.querySelector(`input[name="game-mode"][value="${savedMode}"]`);
  if (modeRadio) modeRadio.checked = true;
}

// Expose variables globally so SlideshowManager can read them
window.playerNameInput = playerNameInput;
window.selectedColor = selectedColor;

// Initialize Socket.io client connection
const socket = io();

// 1. Color picker button event binding
document.querySelectorAll('.color-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    audio.playClick();
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedColor = btn.dataset.color;
    window.selectedColor = selectedColor;
  });
});

// 2. Joining the game
joinBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim() || 'Explorer';
  const code = competitionCodeInput.value.trim().toUpperCase() || 'DEFAULT';
  const mode = document.querySelector('input[name="game-mode"]:checked').value;

  if (!code) {
    showLoginError('Please enter a competition code.');
    return;
  }

  // Initialize audio context on first user click gesture
  audio.init();
  audio.playClick();

  joinBtn.textContent = 'Loading Island...';
  joinBtn.disabled = true;

  // Persist preferences
  localStorage.setItem('mpyst_player_name', name);
  localStorage.setItem('mpyst_competition_code', code);
  localStorage.setItem('mpyst_game_mode', mode);

  // Join the server lobby room
  socket.emit('join', {
    name: name,
    color: selectedColor,
    mode: mode,
    competitionCode: code,
    playerToken: playerToken
  });
});

socket.on('joined', (data) => {
  const { playerToken: newToken, competition, name, color } = data;
  if (newToken) {
    playerToken = newToken;
    localStorage.setItem('mpyst_player_token', playerToken);
  }

  window.currentCompetition = competition;
  const mode = competition.mode;

  // Setup local puzzle controller
  window.gamePuzzles = new PuzzleManager(socket, mode);

  // Set HUD mode badge display
  const badgeText = {
    competition: '🏁 Competition',
    coop: '🤝 Co-op Sync',
    solo: '🧭 Solo Mode'
  }[mode] || mode;
  modeBadge.textContent = badgeText;
  modeBadge.style.borderColor = mode === 'coop' ? '#d4af37' : (mode === 'competition' ? '#ef4444' : '#3b82f6');
  modeBadge.style.color = mode === 'coop' ? '#d4af37' : (mode === 'competition' ? '#ef4444' : '#3b82f6');

  // Show leaderboard in competition mode
  if (mode === 'competition') {
    leaderboardPanel.classList.remove('hidden');
    fetchLeaderboard(competition.code);
  }

  // Instantiate Slideshow navigation engine
  window.gameEngine = new SlideshowManager(socket, mode);
  window.gameEngine.renderCurrentNode();

  // Hide login overlay, reveal game screen
  loginOverlay.classList.add('hidden');
  gameHud.classList.remove('hidden');

  window.gamePuzzles.showFeedback(`Welcome to mPyst, ${name}! You are in competition "${competition.name}".`);
  window.gamePuzzles.showFeedback(`<strong>🔎 NEED CLUES?</strong> Walk up the steps from the Docks to enter the <strong>Library</strong>. Inspect the <strong>bookshelf</strong> or the <strong>red & blue book podiums</strong> to read the journals containing all combinations, codes, and patterns!`);

  // Monitor victory book reveal state
  setInterval(() => {
    if (window.gamePuzzles && window.gamePuzzles.state.mystBookRevealed && !window.victoryChimePlayed) {
      window.victoryChimePlayed = true;
      audio.playSuccess();
      if (window.gameEngine) {
        window.gameEngine.navigateToNode('fireplace_node');
      }
      setTimeout(() => {
        victoryOverlay.classList.remove('hidden');
      }, 1500);
    }
  }, 1000);
});

socket.on('join_error', (err) => {
  joinBtn.textContent = 'Enter Island';
  joinBtn.disabled = false;
  showLoginError(err.message || 'Could not join the competition.');
});

function showLoginError(msg) {
  let errorEl = document.getElementById('login-error');
  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.id = 'login-error';
    errorEl.style.color = 'var(--danger)';
    errorEl.style.marginTop = '12px';
    loginOverlay.querySelector('.login-card').appendChild(errorEl);
  }
  errorEl.textContent = msg;
}

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

  if (loginOverlay.classList.contains('hidden')) {
    audio.playClick();
  }
});

// Leaderboard updates
socket.on('leaderboard_update', (data) => {
  if (window.currentCompetition && data.competitionCode === window.currentCompetition.code) {
    renderLeaderboard(data.leaderboard);
  }
});

async function fetchLeaderboard(code) {
  try {
    const res = await fetch(`/api/competitions/${code}/leaderboard`);
    if (!res.ok) return;
    const data = await res.json();
    renderLeaderboard(data);
  } catch (e) {
    console.error('Leaderboard fetch failed', e);
  }
}

function renderLeaderboard(players) {
  leaderboardList.innerHTML = '';
  if (!players || players.length === 0) {
    leaderboardList.innerHTML = '<div class="leaderboard-row">No players yet.</div>';
    return;
  }
  players.forEach((p, idx) => {
    const progress = calculateProgress(p.progress);
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.innerHTML = `
      <span class="leaderboard-rank">#${idx + 1}</span>
      <span class="leaderboard-dot" style="background:${p.color || '#ffd700'}"></span>
      <span class="leaderboard-name">${p.name}</span>
      <span class="leaderboard-progress">${progress}%</span>
    `;
    leaderboardList.appendChild(row);
  });
}

function calculateProgress(progress) {
  if (!progress || typeof progress !== 'object') return 0;
  const checks = [
    progress.bridgeRaised,
    progress.elevatorPowered,
    progress.generatorSolved,
    progress.spaceshipSolved,
    progress.shrineSolved,
    progress.cavernSolved,
    progress.markerSwitchesRaised,
    progress.imagerSolved,
    progress.starChartSolved,
    progress.cabinSafeOpened,
    progress.shipMarkersAligned,
    progress.mystBookRevealed
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// 4. Final Victory book interaction
victoryBook.addEventListener('click', () => {
  audio.playVictory();
  window.gamePuzzles.showFeedback("You touched the Myst Book! A linking portal opens...");
});

// 5. Reset Game state
resetBtn.addEventListener('click', () => {
  audio.playClick();
  victoryOverlay.classList.add('hidden');
  window.victoryChimePlayed = false;

  if (window.gameEngine) {
    window.gameEngine.navigateToNode('docks');
    window.gameEngine.closeActivePuzzle();
  }

  if (window.gamePuzzles) {
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
