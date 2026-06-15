import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import {
  initDatabase,
  generateToken,
  hashPassword,
  createCompetition,
  getCompetitionByCode,
  getCompetitionById,
  listCompetitions,
  updateCompetitionActive,
  deleteCompetition,
  resetCompetition,
  getPlayerCount,
  createPlayer,
  getPlayerByToken,
  updatePlayerName,
  savePlayerProgress,
  touchPlayer,
  getPlayersByCompetition,
  getLeaderboard,
  recordEvent,
  getRecentEvents
} from './server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.MPYST_ADMIN_PASSWORD || 'admin';
const ADMIN_TOKEN = hashPassword(ADMIN_PASSWORD);

initDatabase();

// Ensure a fallback default competition exists so the island is always joinable
if (!getCompetitionByCode('DEFAULT')) {
  createCompetition({ code: 'DEFAULT', name: 'Default Island', mode: 'coop', maxPlayers: 20 });
}

let io;

// In-memory runtime state for active competitions
const activeCompetitions = new Map(); // competitionId -> { coopState, sockets: Set() }
const onlinePlayers = new Map(); // socketId -> { player, competitionId, socket }

function getOrCreateActiveCompetition(competitionId) {
  if (!activeCompetitions.has(competitionId)) {
    activeCompetitions.set(competitionId, {
      coopState: createInitialPuzzleState(),
      sockets: new Set()
    });
  }
  return activeCompetitions.get(competitionId);
}

function createInitialPuzzleState() {
  return {
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
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body?.adminToken || req.query?.adminToken;
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function broadcastLeaderboard(competitionId) {
  const leaderboard = getLeaderboard(competitionId);
  const competition = getCompetitionById(competitionId);
  io.to(`competition:${competitionId}`).emit('leaderboard_update', {
    competitionCode: competition?.code,
    leaderboard
  });
}

function broadcastPlayers(competitionId) {
  const players = getPlayersByCompetition(competitionId);
  const onlineList = Array.from(onlinePlayers.values())
    .filter(p => p.competitionId === competitionId)
    .map(p => ({
      id: p.socket.id,
      name: p.player.name,
      color: p.player.color,
      node: p.socket.currentNode || 'docks'
    }));

  io.to(`competition:${competitionId}`).emit('players_list', onlineList);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(express.json());

  // ========== ADMIN API ==========
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body || {};
    if (hashPassword(password) !== ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
    res.json({ token: ADMIN_TOKEN });
  });

  app.get('/api/admin/competitions', requireAdmin, (req, res) => {
    const competitions = listCompetitions();
    const enriched = competitions.map(c => ({
      ...c,
      playerCount: getPlayerCount(c.id)
    }));
    res.json(enriched);
  });

  app.post('/api/admin/competitions', requireAdmin, (req, res) => {
    const { code, name, mode = 'competition', maxPlayers = 20, adminPassword } = req.body || {};
    if (!code || !name) {
      return res.status(400).json({ error: 'code and name are required' });
    }
    try {
      const adminPasswordHash = adminPassword ? hashPassword(adminPassword) : null;
      const competition = createCompetition({
        code,
        name,
        mode,
        maxPlayers: Math.min(Math.max(parseInt(maxPlayers) || 20, 1), 20),
        adminPasswordHash
      });
      res.json(competition);
    } catch (err) {
      res.status(409).json({ error: err.message });
    }
  });

  app.get('/api/admin/competitions/:code', requireAdmin, (req, res) => {
    const competition = getCompetitionByCode(req.params.code);
    if (!competition) return res.status(404).json({ error: 'Competition not found' });

    const leaderboard = getLeaderboard(competition.id);
    const events = getRecentEvents(competition.id, 200);
    res.json({ competition, leaderboard, events });
  });

  app.post('/api/admin/competitions/:code/toggle', requireAdmin, (req, res) => {
    const competition = getCompetitionByCode(req.params.code);
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    const updated = updateCompetitionActive(competition.id, !competition.active);
    res.json(updated);
  });

  app.post('/api/admin/competitions/:code/reset', requireAdmin, (req, res) => {
    const competition = getCompetitionByCode(req.params.code);
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    resetCompetition(competition.id);
    const active = getOrCreateActiveCompetition(competition.id);
    active.coopState = createInitialPuzzleState();
    broadcastLeaderboard(competition.id);
    res.json({ success: true });
  });

  app.delete('/api/admin/competitions/:code', requireAdmin, (req, res) => {
    const competition = getCompetitionByCode(req.params.code);
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    deleteCompetition(competition.id);
    activeCompetitions.delete(competition.id);
    res.json({ success: true });
  });

  // ========== PUBLIC API ==========
  app.get('/api/competitions/:code', (req, res) => {
    const competition = getCompetitionByCode(req.params.code);
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    // Don't expose password hash
    const { admin_password_hash, ...safe } = competition;
    res.json(safe);
  });

  app.get('/api/competitions/:code/leaderboard', (req, res) => {
    const competition = getCompetitionByCode(req.params.code);
    if (!competition) return res.status(404).json({ error: 'Competition not found' });
    res.json(getLeaderboard(competition.id));
  });

  // ========== ADMIN PANEL ==========
  app.get('/admin', async (req, res, next) => {
    try {
      if (isProd) {
        res.sendFile(path.join(__dirname, 'dist', 'admin.html'));
      } else {
        let template = fs.readFileSync(path.resolve(__dirname, 'admin.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      }
    } catch (e) {
      next(e);
    }
  });

  // ========== SOCKET.IO ==========
  io.on('connection', (socket) => {
    socket.on('join', async (playerData) => {
      const { name, color, mode, competitionCode, playerToken } = playerData || {};

      const competition = getCompetitionByCode(competitionCode || 'DEFAULT');
      if (!competition) {
        socket.emit('join_error', { message: 'Competition not found. Ask your teacher for the code.' });
        return;
      }
      if (!competition.active) {
        socket.emit('join_error', { message: 'This competition is not currently active.' });
        return;
      }

      const active = getOrCreateActiveCompetition(competition.id);

      // Reconnect by token if the competition matches, otherwise create a new player.
      let player;
      if (playerToken) {
        const existing = getPlayerByToken(playerToken);
        if (existing && existing.competitionId === competition.id) {
          player = existing;
        }
      }

      if (!player) {
        // Enforce max players across all registered players for this competition
        const currentCount = getPlayerCount(competition.id);
        if (currentCount >= competition.max_players) {
          socket.emit('join_error', { message: `This competition is full (${competition.max_players} players max).` });
          return;
        }
        player = createPlayer({
          token: generateToken(),
          name: name || 'Explorer',
          color: color || '#ffd700',
          competitionId: competition.id,
          progress: createInitialPuzzleState()
        });
      } else {
        // Update name/color if changed
        player = updatePlayerName(player.token, name || player.name, color || player.color);
      }

      // Resolve effective mode: competition code mode overrides client mode
      const effectiveMode = competition?.mode || mode || 'coop';

      socket.join(`competition:${competition.id}`);
      active.sockets.add(socket.id);

      const onlinePlayer = {
        socket,
        player,
        competitionId: competition.id,
        mode: effectiveMode
      };
      onlinePlayers.set(socket.id, onlinePlayer);

      socket.emit('joined', {
        playerToken: player.token,
        competition: {
          id: competition.id,
          code: competition.code,
          name: competition.name,
          mode: effectiveMode
        },
        name: player.name,
        color: player.color
      });

      // Send current puzzle state
      if (effectiveMode === 'coop') {
        // Merge player's saved progress into the in-memory coop state if coop state is fresh
        if (Object.keys(active.coopState).every(k => !active.coopState[k] || active.coopState[k] === createInitialPuzzleState()[k])) {
          active.coopState = { ...createInitialPuzzleState(), ...player.progress, ...active.coopState };
        }
        socket.emit('puzzle_state', active.coopState);
      } else {
        socket.emit('puzzle_state', player.progress);
      }

      broadcastPlayers(competition.id);
      broadcastLeaderboard(competition.id);

      recordEvent({
        competitionId: competition.id,
        playerId: player.id,
        eventType: 'join',
        data: { name: player.name, mode: effectiveMode }
      });
    });

    socket.on('move_node', (nodeData) => {
      const op = onlinePlayers.get(socket.id);
      if (!op) return;
      socket.currentNode = nodeData.node || 'docks';
      socket.to(`competition:${op.competitionId}`).emit('player_moved_node', {
        id: socket.id,
        name: op.player.name,
        color: op.player.color,
        node: socket.currentNode
      });
    });

    socket.on('player_action', (actionData) => {
      const op = onlinePlayers.get(socket.id);
      if (!op) return;
      socket.to(`competition:${op.competitionId}`).emit('player_action_triggered', {
        id: socket.id,
        name: op.player.name,
        color: op.player.color,
        ...actionData
      });
    });

    socket.on('chat_message', (msg) => {
      const op = onlinePlayers.get(socket.id);
      if (!op) return;
      io.to(`competition:${op.competitionId}`).emit('chat_received', {
        sender: op.player.name,
        color: op.player.color,
        text: msg
      });
    });

    socket.on('puzzle_interaction', (update) => {
      const op = onlinePlayers.get(socket.id);
      if (!op) return;

      const competition = getCompetitionById(op.competitionId);
      const active = getOrCreateActiveCompetition(op.competitionId);
      const effectiveMode = competition?.mode || op.mode || 'coop';
      op.mode = effectiveMode;

      if (effectiveMode === 'coop') {
        active.coopState = { ...active.coopState, ...update };
        io.to(`competition:${op.competitionId}`).emit('puzzle_update', active.coopState);
      } else {
        const player = getPlayerByToken(op.player.token);
        const newProgress = { ...player.progress, ...update };
        savePlayerProgress(op.player.token, newProgress);
        op.player = getPlayerByToken(op.player.token); // refresh local ref
        socket.emit('puzzle_update', newProgress);
      }

      // Persist the interaction as an event for admin auditing
      recordEvent({
        competitionId: op.competitionId,
        playerId: op.player.id,
        eventType: 'puzzle_interaction',
        data: { update }
      });

      broadcastLeaderboard(op.competitionId);
    });

    socket.on('disconnect', () => {
      const op = onlinePlayers.get(socket.id);
      if (op) {
        const active = getOrCreateActiveCompetition(op.competitionId);
        active.sockets.delete(socket.id);
        onlinePlayers.delete(socket.id);
        socket.to(`competition:${op.competitionId}`).emit('player_left', socket.id);
        broadcastPlayers(op.competitionId);
      }
    });
  });

  // ========== STATIC / VITE ==========
  let vite;
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      if (url === '/admin') return next(); // handled above
      if (isProd) {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      } else {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      }
    } catch (e) {
      if (vite) vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
