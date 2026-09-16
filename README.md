ProxySpeak

ProxySpeak is a browser-based, real-time proximity audio environment where users can move through a shared virtual world and communicate with nearby users through spatially-aware voice communication.

The project is being developed in stages, beginning with a real-time multiplayer foundation and progressing toward proximity-based WebRTC audio.

Overview

The long-term goal is to create a virtual environment in which physical distance inside the world affects communication.

Planned capabilities include:

Shared virtual spaces

Real-time player movement

Live player presence

Nearby-player detection

Proximity-based voice communication

Distance-based audio attenuation

Browser-based access without requiring a native application

The initial implementation focuses on movement and presence synchronization. Audio will be added after the real-time world foundation is stable.

Current Status

The initial project foundation is complete and has been verified locally.

Implemented:

React/Vite frontend

Canvas-based virtual world

Basic keyboard movement

Node.js/Express backend

Health-check endpoint

npm workspace configuration

Concurrent development scripts

Current development focus:

Establish the Socket.io connection and synchronize multiple connected players in the same virtual world.

Technology Stack

Current Stack

React

Vite

JavaScript

HTML5 Canvas

Node.js

Express

Planned Stack

Socket.io — real-time communication

MongoDB — persistence and geospatial queries

WebRTC — peer-to-peer audio

Web Audio API — distance-based audio processing

Redis — optional future scaling layer

Repository Structure

ProxySpeak/
├── client/                  # React/Vite frontend
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                  # Node.js/Express backend
│   ├── src/
│   ├── package.json
│   └── .env.example
│
├── docs/                    # Project documentation
├── contracts.md             # Technical contracts and system behavior
├── README.md                # Project documentation
├── package.json             # Root workspace configuration
└── .gitignore

Requirements

Install the following tools:

Node.js

npm

Git

A current LTS version of Node.js is recommended.

Installation

Clone the repository:

git clone https://github.com/shivamsingh200431/ProxySpeak.git

Enter the project directory:

cd ProxySpeak

Install dependencies:

npm install

Running the Development Environment

Start both frontend and backend:

npm run dev

The services will be available at:

Frontend: http://localhost:5173

Backend: http://localhost:5000

Individual Commands

Start both services:

npm run dev

Start only the frontend:

npm run dev:client

Start only the backend:

npm run dev:server

Build the frontend:

npm run build

Start the backend:

npm start

Backend Health Check

Open the following address in a browser:

http://localhost:5000/health

Expected response:

{
  "status": "ok",
  "service": "proxyspeak-server"
}

Development Roadmap

Foundation

Initialize monorepo

Configure npm workspaces

Create React/Vite frontend

Create Express backend

Create Canvas world prototype

Add basic player movement

Add health endpoint

Verify local development

Push initial project to GitHub

Real-Time Multiplayer

Add Socket.io client integration

Establish client-server connection

Assign unique player IDs

Define socket event contracts

Handle player joins and leaves

Synchronize player positions

Render remote players

Handle disconnects and stale state

Proximity Audio

Define world coordinate and distance rules

Detect nearby players

Apply proximity thresholds

Add WebRTC signaling

Request microphone access

Establish peer-to-peer audio

Add mute controls

Add distance-based volume attenuation

Handle audio connection failures

Persistence and Deployment

Integrate MongoDB

Add persistent world data where required

Add authentication if required

Configure production environment

Build deployment configuration

Deploy frontend and backend

Add monitoring and error handling

Development Guidelines

Keep frontend rendering and networking logic separated.

Keep backend routes and real-time state management modular.

Validate data received from clients.

Prefer explicit, documented event contracts.

Avoid premature infrastructure.

Keep configuration in environment variables.

Verify each milestone locally before starting the next.

Update technical contracts when shared interfaces or behavior change.

Technical Documentation

See contracts.md for:

Architecture

Component boundaries

Shared data structures

Planned Socket.io events

Server authority rules

Audio architecture

Development milestones

License

License information will be added when the project reaches a release stage.