// Node-based navigation graph representing the Myst Island slideshow scenes
export const NODES = {
  'docks': {
    id: 'docks',
    title: 'The Docks',
    image: '/assets/myst_docks.png',
    links: [
      { type: 'forward', target: 'docks_path' },
      { type: 'right', target: 'docks_valve_zoom' }
    ],
    hotspots: [
      {
        x: 5, y: 45, w: 26, h: 45, // Valve pillar on left
        action: 'navigate',
        target: 'docks_valve_zoom',
        tooltip: 'Examine Clock Valve Pillar'
      },
      {
        x: 80, y: 55, w: 18, h: 22,
        action: 'open_puzzle',
        puzzleId: 'puzzle-marker-switch',
        data: { switchId: 'docks' },
        tooltip: 'Marker Switch'
      },
      {
        x: 35, y: 35, w: 40, h: 45, // Wooden walkway path heading forward
        action: 'navigate',
        target: 'docks_path',
        tooltip: 'Walk Forward'
      }
    ]
  },
  'docks_valve_zoom': {
    id: 'docks_valve_zoom',
    title: 'Clock Valve Pillar',
    image: '/assets/myst_docks.png',
    links: [
      { type: 'back', target: 'docks' }
    ]
  },
  'docks_path': {
    id: 'docks_path',
    title: 'Docks Path',
    getImage: (state) => state.bridgeRaised ? '/assets/myst_clock_bridge.png' : '/assets/myst_clock_water.png',
    links: [
      { type: 'back', target: 'docks' },
      { type: 'left', target: 'library_path' },
      { 
        type: 'forward', 
        target: 'clock_tower_exterior',
        condition: (state) => state.bridgeRaised,
        lockedMessage: 'The clock tower lies across deep water. The bridge must be raised.'
      }
    ],
    hotspots: [
      {
        x: 30, y: 5, w: 45, h: 60, // Clock Tower in the distance
        action: 'navigate',
        target: 'clock_tower_exterior',
        condition: (state) => state.bridgeRaised,
        lockedMessage: 'The clock tower lies across deep water. The bridge must be raised.',
        tooltip: 'Cross Bridge to Clock Tower'
      },
      {
        x: 4, y: 82, w: 12, h: 12,
        action: 'open_puzzle',
        puzzleId: 'puzzle-marker-switch',
        data: { switchId: 'docks_path' },
        tooltip: 'Marker Switch'
      },
      {
        x: 0, y: 20, w: 20, h: 60, // Left rock pathway
        action: 'navigate',
        target: 'library_path',
        tooltip: 'Go to Library steps'
      }
    ]
  },
  'clock_tower_exterior': {
    id: 'clock_tower_exterior',
    title: 'Clock Tower Entrance',
    image: '/assets/myst_clock_bridge.png',
    links: [
      { type: 'forward', target: 'clock_tower_interior' },
      { type: 'back', target: 'docks_path' },
      {
        type: 'left',
        target: 'forest_path',
        condition: (state) => state.generatorSolved,
        lockedMessage: 'A forest trail is overgrown. The generator pump could clear the path.'
      }
    ],
    hotspots: [
      {
        x: 54, y: 46, w: 4, h: 8, // Clock tower door
        action: 'navigate',
        target: 'clock_tower_interior',
        tooltip: 'Enter Clock Tower'
      },
      {
        x: 0, y: 25, w: 22, h: 55, // Forest trail
        action: 'navigate',
        target: 'forest_path',
        condition: (state) => state.generatorSolved,
        lockedMessage: 'A forest trail is overgrown. The generator pump could clear the path.',
        tooltip: 'Forest Trail'
      }
    ]
  },
  'clock_tower_interior': {
    id: 'clock_tower_interior',
    title: 'Clock Tower Gearbox',
    image: '/assets/myst_clock_interior.png',
    links: [
      { type: 'back', target: 'clock_tower_exterior' }
    ]
  },
  'library_path': {
    id: 'library_path',
    title: 'Steps to the Library',
    image: '/assets/myst_library_steps.png',
    links: [
      { type: 'forward', target: 'library_exterior' },
      { type: 'back', target: 'docks_path' }
    ],
    hotspots: [
      {
        x: 30, y: 4, w: 40, h: 40, // Library dome at top of steps
        action: 'navigate',
        target: 'library_exterior',
        tooltip: 'Walk up steps to Library'
      }
    ]
  },
  'library_exterior': {
    id: 'library_exterior',
    title: 'Library Entrance',
    image: '/assets/myst_library_steps.png', // reuse library path steps image for exterior zoom
    links: [
      { type: 'forward', target: 'library_interior' },
      { type: 'back', target: 'library_path' },
      { type: 'left', target: 'cabin_path' },
      { type: 'right', target: 'spaceship_path' },
      {
        type: 'forward',
        target: 'library_dome',
        condition: (state) => state.elevatorPowered,
        lockedMessage: 'The dome elevator is locked. The clock tower gears must power it first.'
      }
    ],
    hotspots: [
      {
        x: 53, y: 24, w: 6, h: 10, // Library doorway
        action: 'navigate',
        target: 'library_interior',
        tooltip: 'Enter Library'
      },
      {
        x: 42, y: 88, w: 14, h: 8,
        action: 'open_puzzle',
        puzzleId: 'puzzle-marker-switch',
        data: { switchId: 'library_exterior' },
        tooltip: 'Marker Switch'
      },
      {
        x: 30, y: 0, w: 40, h: 20,
        action: 'navigate',
        target: 'library_dome',
        condition: (state) => state.elevatorPowered,
        lockedMessage: 'The dome elevator is locked. The clock tower gears must power it first.',
        tooltip: 'Ascend to Library Dome'
      },
      {
        x: 0, y: 35, w: 30, h: 55, // Left path to generator cabin
        action: 'navigate',
        target: 'cabin_path',
        tooltip: 'Path to Generator Cabin'
      },
      {
        x: 75, y: 35, w: 25, h: 55, // Right path to spaceship pad
        action: 'navigate',
        target: 'spaceship_path',
        tooltip: 'Path to Spaceship Landing Pad'
      }
    ]
  },
  'library_dome': {
    id: 'library_dome',
    title: 'Library Dome Observatory',
    image: '/assets/myst_library_dome.png',
    links: [
      { type: 'back', target: 'library_exterior' }
    ],
    hotspots: [
      {
        x: 20, y: 10, w: 60, h: 80,
        action: 'open_puzzle',
        puzzleId: 'puzzle-star-chart',
        tooltip: 'Inspect Star Chart'
      }
    ]
  },
  'library_interior': {
    id: 'library_interior',
    title: 'The Library',
    image: '/assets/myst_library_interior.png',
    links: [
      { type: 'back', target: 'library_exterior' }
    ],
    hotspots: [
      {
        x: 68, y: 22, w: 23, h: 56, // Bookshelf
        action: 'open_puzzle',
        puzzleId: 'puzzle-book',
        tooltip: 'Inspect Bookshelf'
      },
      {
        x: 19, y: 58, w: 22, h: 35, // Red book podium
        action: 'open_puzzle',
        puzzleId: 'puzzle-red-book',
        tooltip: 'Inspect Red Book'
      },
      {
        x: 54, y: 58, w: 18, h: 28, // Blue book podium
        action: 'open_puzzle',
        puzzleId: 'puzzle-blue-book',
        tooltip: 'Inspect Blue Book'
      },
      {
        x: 38, y: 28, w: 14, h: 18, // Wall imager
        action: 'open_puzzle',
        puzzleId: 'puzzle-imager',
        tooltip: 'Inspect Imager'
      },
      {
        x: 45, y: 48, w: 10, h: 22, // Stone fireplace
        action: 'navigate',
        target: 'fireplace_node',
        tooltip: 'Inspect Fireplace'
      }
    ]
  },
  'fireplace_node': {
    id: 'fireplace_node',
    title: 'Library Fireplace',
    getImage: (state) => state.mystBookRevealed ? '/assets/myst_fireplace_open.png' : '/assets/myst_fireplace.png',
    links: [
      { type: 'back', target: 'library_interior' }
    ]
  },
  'cabin_path': {
    id: 'cabin_path',
    title: 'Forest Path to Cabin',
    image: '/assets/myst_cabin_path.png',
    links: [
      { type: 'forward', target: 'cabin_exterior' },
      { type: 'back', target: 'library_exterior' }
    ],
    hotspots: [
      {
        x: 10, y: 35, w: 38, h: 42, // Generator cabin on path
        action: 'navigate',
        target: 'cabin_exterior',
        tooltip: 'Walk to Cabin'
      },
      {
        x: 86, y: 75, w: 12, h: 18,
        action: 'open_puzzle',
        puzzleId: 'puzzle-marker-switch',
        data: { switchId: 'cabin_path' },
        tooltip: 'Marker Switch'
      }
    ]
  },
  'cabin_exterior': {
    id: 'cabin_exterior',
    title: 'Generator Cabin Entrance',
    image: '/assets/myst_cabin_exterior.png',
    links: [
      { type: 'forward', target: 'cabin_interior' },
      { type: 'back', target: 'cabin_path' }
    ],
    hotspots: [
      {
        x: 16, y: 48, w: 10, h: 24, // Cabin door
        action: 'navigate',
        target: 'cabin_interior',
        tooltip: 'Enter Cabin'
      }
    ]
  },
  'cabin_interior': {
    id: 'cabin_interior',
    title: 'Generator Switchboard',
    image: '/assets/myst_cabin_interior.png',
    links: [
      { type: 'back', target: 'cabin_exterior' }
    ]
  },
  'spaceship_path': {
    id: 'spaceship_path',
    title: 'Path to Landing Pad',
    image: '/assets/myst_spaceship_path.png',
    links: [
      { type: 'forward', target: 'spaceship_exterior' },
      { type: 'back', target: 'library_exterior' }
    ],
    hotspots: [
      {
        x: 28, y: 40, w: 45, h: 25, // Spaceship in the distance
        action: 'navigate',
        target: 'spaceship_exterior',
        tooltip: 'Walk to Spaceship'
      },
      {
        x: 2, y: 55, w: 12, h: 20,
        action: 'open_puzzle',
        puzzleId: 'puzzle-marker-switch',
        data: { switchId: 'spaceship_path' },
        tooltip: 'Marker Switch'
      }
    ]
  },
  'spaceship_exterior': {
    id: 'spaceship_exterior',
    title: 'Spaceship Landing Pad',
    image: '/assets/myst_spaceship_exterior.png',
    links: [
      { type: 'back', target: 'spaceship_path' },
      {
        type: 'forward',
        target: 'spaceship_interior',
        condition: (state) => state.generatorSolved,
        lockedMessage: 'The spaceship door is locked tight. It needs power to activate the controls.'
      }
    ],
    hotspots: [
      {
        x: 37, y: 42, w: 16, h: 8, // Spaceship glass window door
        action: 'navigate',
        target: 'spaceship_interior',
        condition: (state) => state.generatorSolved,
        lockedMessage: 'The spaceship door is locked tight. It needs power to activate the controls.',
        tooltip: 'Enter Spaceship'
      }
    ]
  },
  'spaceship_interior': {
    id: 'spaceship_interior',
    title: 'Spaceship Console',
    image: '/assets/myst_spaceship_interior.png',
    links: [
      { type: 'back', target: 'spaceship_exterior' }
    ]
  },

  // Forest Shrine zone
  'forest_path': {
    id: 'forest_path',
    title: 'Forest Trail',
    image: '/assets/myst_forest_path.png',
    links: [
      { type: 'back', target: 'clock_tower_exterior' },
      { type: 'forward', target: 'forest_shrine' }
    ],
    hotspots: [
      {
        x: 30, y: 5, w: 40, h: 60,
        action: 'navigate',
        target: 'forest_shrine',
        tooltip: 'Approach the Shrine'
      }
    ]
  },
  'forest_shrine': {
    id: 'forest_shrine',
    title: 'Forest Shrine',
    image: '/assets/myst_forest_shrine.png',
    links: [
      { type: 'back', target: 'forest_path' },
      {
        type: 'forward',
        target: 'cavern_path',
        condition: (state) => state.shrineSolved,
        lockedMessage: 'A stone door blocks the tunnel. The shrine aqueduct must flow first.'
      }
    ],
    hotspots: [
      {
        x: 25, y: 20, w: 50, h: 50,
        action: 'open_puzzle',
        puzzleId: 'puzzle-forest-shrine',
        tooltip: 'Examine the Aqueduct'
      },
      {
        x: 45, y: 60, w: 10, h: 25,
        action: 'navigate',
        target: 'cavern_path',
        condition: (state) => state.shrineSolved,
        lockedMessage: 'A stone door blocks the tunnel. The shrine aqueduct must flow first.',
        tooltip: 'Enter the tunnel'
      }
    ]
  },

  // Crystal Cavern zone
  'cavern_path': {
    id: 'cavern_path',
    title: 'Tunnel to the Caverns',
    image: '/assets/myst_cavern_path.png',
    links: [
      { type: 'back', target: 'forest_shrine' },
      { type: 'forward', target: 'crystal_cavern' }
    ],
    hotspots: [
      {
        x: 30, y: 5, w: 40, h: 60,
        action: 'navigate',
        target: 'crystal_cavern',
        tooltip: 'Enter the Crystal Cavern'
      }
    ]
  },
  'crystal_cavern': {
    id: 'crystal_cavern',
    title: 'Crystal Cavern',
    image: '/assets/myst_crystal_cavern.png',
    links: [
      { type: 'back', target: 'cavern_path' }
    ],
    hotspots: [
      {
        x: 15, y: 20, w: 70, h: 55,
        action: 'open_puzzle',
        puzzleId: 'puzzle-crystal-cavern',
        tooltip: 'Align the Crystals'
      }
    ]
  }
};
