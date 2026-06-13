import { NODES } from './Nodes.js';
import { audio } from './Audio.js';

export class SlideshowManager {
  constructor(socket, mode) {
    this.socket = socket;
    this.mode = mode; // 'coop' or 'solo'
    
    this.currentNodeId = 'docks';
    this.remotePlayers = {}; // dictionary of socketId -> playerData
    
    // DOM Elements
    this.sceneImage = document.getElementById('scene-image');
    this.actionHotspots = document.getElementById('action-hotspots');
    this.nodePlayersList = document.getElementById('node-players-list');
    this.navArrows = {
      forward: document.querySelector('.nav-arrow.arrow-forward'),
      left: document.querySelector('.nav-arrow.arrow-left'),
      right: document.querySelector('.nav-arrow.arrow-right'),
      back: document.querySelector('.nav-arrow.arrow-back')
    };

    this.setupListeners();
  }

  setupListeners() {
    // Arrow clicks
    Object.keys(this.navArrows).forEach((dir) => {
      const arrow = this.navArrows[dir];
      arrow.addEventListener('click', () => {
        const node = NODES[this.currentNodeId];
        if (!node) return;
        
        // Find the matching link direction
        const link = node.links.find(l => l.type === dir);
        if (link) {
          this.handleLinkNavigation(link);
        }
      });
    });

    // Receive player lists and transitions
    this.socket.on('players_list', (list) => {
      this.remotePlayers = {};
      list.forEach((p) => {
        if (p.id !== this.socket.id) {
          this.remotePlayers[p.id] = p;
        }
      });
      this.renderCurrentNode();
    });

    this.socket.on('player_moved_node', (p) => {
      if (this.remotePlayers[p.id]) {
        this.remotePlayers[p.id].node = p.node;
      } else if (p.id !== this.socket.id) {
        this.remotePlayers[p.id] = p;
      }
      this.renderCurrentNode();
    });

    this.socket.on('player_left', (id) => {
      if (this.remotePlayers[id]) {
        delete this.remotePlayers[id];
      }
      this.renderCurrentNode();
    });

    // Listen to coop puzzle updates to re-render images if they are dynamic (like the bridge)
    this.socket.on('puzzle_update', () => {
      this.renderCurrentNode();
    });
  }

  handleLinkNavigation(link) {
    // Check solve conditions / lock state
    const puzState = window.gamePuzzles ? window.gamePuzzles.state : null;
    
    if (link.condition && puzState) {
      const satisfied = link.condition(puzState);
      if (!satisfied) {
        audio.playBuzzer();
        if (window.gamePuzzles) {
          window.gamePuzzles.showFeedback(link.lockedMessage || 'That path is currently inaccessible.');
        }
        return;
      }
    }

    // Play walk step audio
    audio.playClick();
    
    // Navigate
    this.navigateToNode(link.target);
  }

  navigateToNode(nodeId) {
    if (!NODES[nodeId]) {
      console.warn(`Node ${nodeId} does not exist.`);
      return;
    }
    
    this.currentNodeId = nodeId;
    
    // Emit navigation change to server
    this.socket.emit('move_node', { node: nodeId });
    
    // Re-render scene
    this.renderCurrentNode();
  }

  renderCurrentNode() {
    const node = NODES[this.currentNodeId];
    if (!node) return;

    // 1. Resolve Background Image
    const puzState = window.gamePuzzles ? window.gamePuzzles.state : null;
    let imgPath = node.image;
    if (node.getImage && puzState) {
      imgPath = node.getImage(puzState);
    }
    
    if (imgPath) {
      this.sceneImage.src = imgPath;
    }

    // 2. Render navigation directional arrows
    Object.keys(this.navArrows).forEach((dir) => {
      const arrow = this.navArrows[dir];
      const link = node.links.find(l => l.type === dir);
      
      if (link) {
        arrow.style.display = 'block';
        // highlight if condition met, or show lock icon
        arrow.classList.remove('locked');
        if (link.condition && puzState && !link.condition(puzState)) {
          arrow.classList.add('locked');
        }
      } else {
        arrow.style.display = 'none';
      }
    });

    // 3. Render puzzle hotspots
    this.actionHotspots.innerHTML = '';
    if (node.hotspots) {
      node.hotspots.forEach((hs) => {
        const hsDiv = document.createElement('div');
        hsDiv.className = 'action-hotspot';
        hsDiv.style.left = `${hs.x}%`;
        hsDiv.style.top = `${hs.y}%`;
        hsDiv.style.width = `${hs.w}%`;
        hsDiv.style.height = `${hs.h}%`;
        
        if (hs.tooltip) {
          hsDiv.title = hs.tooltip;
        }

        hsDiv.addEventListener('click', () => {
          if (hs.action === 'open_puzzle') {
            if (window.gamePuzzles) {
              window.gamePuzzles.openPuzzle(hs.puzzleId);
            }
          } else if (hs.action === 'navigate') {
            audio.playClick();
            this.navigateToNode(hs.target);
          }
        });

        this.actionHotspots.appendChild(hsDiv);
      });
    }

    // 4. Render other players who are AT the same node
    this.nodePlayersList.innerHTML = '';
    let playersAtThisNode = 0;

    Object.values(this.remotePlayers).forEach((p) => {
      if (p.node === this.currentNodeId) {
        playersAtThisNode++;
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        chip.style.setProperty('--chip-color', p.color);
        chip.textContent = p.name;
        this.nodePlayersList.appendChild(chip);
      }
    });

    // Show/hide players panel
    const panel = document.getElementById('node-players-panel');
    if (panel) {
      panel.style.display = playersAtThisNode > 0 ? 'flex' : 'none';
    }

    // 5. Toggle puzzle overlays depending on node
    document.querySelectorAll('.puzzle-overlay-panel').forEach(p => p.classList.add('hidden'));
    
    if (this.currentNodeId === 'docks_valve_zoom') {
      document.getElementById('overlay-clock-valve').classList.remove('hidden');
    } else if (this.currentNodeId === 'clock_tower_interior') {
      document.getElementById('overlay-clock-gears').classList.remove('hidden');
    } else if (this.currentNodeId === 'cabin_interior') {
      document.getElementById('overlay-generator').classList.remove('hidden');
    } else if (this.currentNodeId === 'spaceship_interior') {
      document.getElementById('overlay-spaceship').classList.remove('hidden');
    } else if (this.currentNodeId === 'fireplace_node') {
      document.getElementById('overlay-fireplace').classList.remove('hidden');
    }

    // 6. Update HUD brands
    this.updateHUDPlayersList();
  }

  updateHUDPlayersList() {
    const listEl = document.getElementById('players-list');
    const countEl = document.getElementById('player-count');
    if (listEl) {
      listEl.innerHTML = '';
      
      const localName = window.playerNameInput ? window.playerNameInput.value.trim() : 'You';
      const localColor = window.selectedColor || '#ffd700';

      // Local player
      const localChip = document.createElement('div');
      localChip.className = 'player-chip';
      localChip.style.setProperty('--chip-color', localColor);
      localChip.textContent = `${localName} (You)`;
      listEl.appendChild(localChip);

      // Remote players
      const count = Object.keys(this.remotePlayers).length;
      if (countEl) countEl.textContent = count + 1;

      Object.values(this.remotePlayers).forEach((p) => {
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        chip.style.setProperty('--chip-color', p.color);
        chip.textContent = `${p.name} [${NODES[p.node] ? NODES[p.node].title : 'Exploring'}]`;
        listEl.appendChild(chip);
      });
    }
  }
}
