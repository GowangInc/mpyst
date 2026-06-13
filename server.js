import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Global Cooperative Puzzle State
  let coopPuzzleState = {
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

  // Keep track of connected players
  const players = {};

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Join player
    socket.on('join', (playerData) => {
      players[socket.id] = {
        id: socket.id,
        name: playerData.name || 'Anonymous',
        color: playerData.color || '#ffd700',
        mode: playerData.mode || 'coop',
        node: 'docks'
      };

      // Send list of all existing players to the new player
      socket.emit('players_list', Object.values(players));

      // Send the current cooperative puzzle state to the player (if they are in coop mode)
      if (players[socket.id].mode === 'coop') {
        socket.emit('puzzle_state', coopPuzzleState);
      }

      // Broadcast new player to everyone else
      socket.broadcast.emit('player_joined', players[socket.id]);
    });

    // Handle slideshow node transition
    socket.on('move_node', (nodeData) => {
      if (players[socket.id]) {
        players[socket.id].node = nodeData.node;
        // Broadcast to all other players
        socket.broadcast.emit('player_moved_node', players[socket.id]);
      }
    });

    // Handle player pointing/action events
    socket.on('player_action', (actionData) => {
      if (players[socket.id]) {
        socket.broadcast.emit('player_action_triggered', {
          id: socket.id,
          ...actionData
        });
      }
    });

    // Handle chat message
    socket.on('chat_message', (msg) => {
      if (players[socket.id]) {
        io.emit('chat_received', {
          sender: players[socket.id].name,
          color: players[socket.id].color,
          text: msg
        });
      }
    });

    // Handle cooperative puzzle interaction
    socket.on('puzzle_interaction', (update) => {
      if (players[socket.id] && players[socket.id].mode === 'coop') {
        // Merge updates into global coopPuzzleState
        coopPuzzleState = { ...coopPuzzleState, ...update };
        // Broadcast new state to all players
        io.emit('puzzle_update', coopPuzzleState);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      if (players[socket.id]) {
        delete players[socket.id];
        io.emit('player_left', socket.id);
      }
    });
  });

  // Serve static files / Vite middleware
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

  // Route to serve index.html (with Vite HTML transform in dev mode)
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
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
  });
}

startServer();
