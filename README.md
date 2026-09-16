# ProxySpeak

ProxySpeak is a geospatial proximity-based audio communication ecosystem.

## Planned Technologies

- React
- Vite
- HTML5 Canvas
- Node.js
- Express
- Socket.io
- MongoDB
- WebRTC
- Web Audio API
- Redis later for scaling

## Structure

```text
ProxySpeak/
â”œâ”€â”€ client/
â”œâ”€â”€ server/
â”œâ”€â”€ docs/
â”œâ”€â”€ contracts.md
â”œâ”€â”€ package.json
â”œâ”€â”€ README.md
â””â”€â”€ .gitignore
```

## Setup

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:5000

Health check: http://localhost:5000/health

Important rule: whenever we make a significant decision, we update contracts.md.
