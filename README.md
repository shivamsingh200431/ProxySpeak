# ProxySpeak

A browser-based, real-time proximity audio environment where users move through a shared virtual world and communicate with nearby users through spatially-aware voice communication.

 > The project has an active multiplayer world, server-side proximity detection, and a peer-to-peer WebRTC audio implementation. Current work focuses on signaling resilience and cross-browser verification.

## Overview

ProxySpeak explores virtual communication where distance inside the world affects who can hear whom and how clearly they can hear them.

### Planned capabilities

- Shared virtual spaces
- Real-time player movement
- Live player presence
- Nearby-player detection
- Proximity-based voice communication
- Distance-based audio attenuation
- Browser-based access without a native application

The current implementation includes shared world presence/movement, proximity events, peer-to-peer WebRTC audio negotiation, microphone controls, and distance-based remote playback volume. Audio reliability and browser interoperability remain under active validation.

## Project Status

### Implemented

- React and Vite frontend
- Canvas-based virtual world
- Basic keyboard movement
- Node.js and Express backend
- Backend health-check endpoint
- npm workspace configuration
- Concurrent frontend/backend development scripts

### Current focus

Harden WebRTC negotiation, ICE handling, peer recovery, and validate audio across supported browsers.

## Technology Stack

| Layer | Technology | Status |
| --- | --- | --- |
| Frontend | React, Vite, JavaScript | In use |
| Rendering | HTML5 Canvas | In use |
| Backend | Node.js, Express | In use |
| Real-time communication | Socket.io | In use |
| Persistence | MongoDB | Planned |
| Peer-to-peer audio | WebRTC | Implemented; browser validation ongoing |
| Audio processing | Web Audio API | In use for microphone activity visualization |
| Scaling support | Redis | Optional future phase |

## Repository Structure

```text
ProxySpeak/
├── client/                  # React/Vite frontend
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                  # Node.js/Express backend
│   ├── src/
│   ├── package.json
│   └── .env.example
├── docs/                    # Project documentation
├── contracts.md             # Technical contracts and shared behavior
├── README.md                # Project documentation
├── package.json             # Root workspace configuration
└── .gitignore
```

## Requirements

- Node.js LTS
- npm
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/shivamsingh200431/ProxySpeak.git
cd ProxySpeak
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development environment

```bash
npm run dev
```

The services run at:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Available Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start frontend and backend concurrently |
| `npm run dev:client` | Start only the frontend |
| `npm run dev:server` | Start only the backend |
| `npm run build` | Build the frontend |
| `npm start` | Start the backend |

## Backend Health Check

Open:

```text
http://localhost:5000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "proxyspeak-server"
}
```

## Development Roadmap

### Foundation

- [x] Initialize monorepo
- [x] Configure npm workspaces
- [x] Create React/Vite frontend
- [x] Create Express backend
- [x] Create Canvas world prototype
- [x] Add basic player movement
- [x] Add health endpoint
- [x] Verify local development
- [x] Push initial project to GitHub

### Real-Time Multiplayer

- [x] Add Socket.io client integration
- [x] Establish client-server connection
- [x] Assign unique player IDs
- [x] Define socket event contracts
- [x] Handle player joins and leaves
- [x] Synchronize player positions
- [x] Render remote players
- [x] Handle disconnects and stale state

### Proximity Audio

- [ ] Define world coordinate and distance rules
- [x] Detect nearby players
- [x] Apply proximity thresholds
- [x] Add WebRTC signaling
- [x] Request microphone access
- [x] Establish peer-to-peer audio negotiation
- [x] Add mute controls
- [x] Add distance-based volume attenuation
- [x] Add initial audio connection recovery handling
- [ ] Complete cross-browser audio regression testing
- [ ] Evaluate TURN service for production NAT traversal

### Persistence and Deployment

- [ ] Integrate MongoDB
- [ ] Add persistent world data where required
- [ ] Add authentication if required
- [ ] Configure production environment
- [ ] Build deployment configuration
- [ ] Deploy frontend and backend
- [ ] Add monitoring and error handling

## Development Guidelines

- Keep rendering and networking logic separated.
- Keep backend routes and real-time state management modular.
- Validate all data received from clients.
- Prefer explicit, documented event contracts.
- Avoid premature infrastructure and unnecessary complexity.
- Keep configuration in environment variables.
- Verify each milestone locally before starting the next.
- Update `contracts.md` whenever shared interfaces or behavior change.

## Documentation

See [`contracts.md`](./contracts.md) for architecture decisions, component boundaries, shared data structures, planned Socket.io events, server authority rules, audio architecture, and development milestones.

## License

License information will be added when the project reaches a release stage.
