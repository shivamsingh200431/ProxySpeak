import { useEffect, useMemo, useRef, useState } from "react";
import { useMovement } from "./hooks/useMovement";
import WorldCanvas from "./components/WorldCanvas";
import { socket, SERVER_URL } from "./socket/index";
import { AUDIO_RADIUS, WORLD_HEIGHT, WORLD_WIDTH } from "./constants/world";

const peoplePreview = [
  { name: "Aarav", distance: 8, tone: "green", mic: true },
  { name: "Riya", distance: 12, tone: "green", mic: true },
  { name: "Kabir", distance: 18, tone: "yellow", mic: true },
  { name: "Mira", distance: 24, tone: "red", mic: false },
  { name: "Dev", distance: 34, tone: "yellow", mic: true },
  { name: "Ishita", distance: 56, tone: "red", mic: false },
  { name: "Arjun", distance: 72, tone: "red", mic: false },
];

function Icon({ name, size = 20 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M17 11a4 4 0 0 0 0-8" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15" /><path d="M15 6v15" /></>,
    settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6v-2.4h.84A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.67 5V4h2.4v1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.34 10c.2.62.78 1.03 1.44 1.03H21v2.4h-.22A1.7 1.7 0 0 0 19.4 15Z" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-4.5A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    fullscreen: <><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    smile: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.3 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.07.07l2-2A5 5 0 0 0 12 4l-1 1" /><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1-1" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function Brand() {
  return (
    <div className="workspace-brand">
      <span className="workspace-brand__mark"><i /><i /><i /></span>
      <span><b>Proxy</b><strong>Speak</strong></span>
      <small>Be closer. Talk naturally.</small>
    </div>
  );
}

function GlassButton({ children, className = "", ...props }) {
  return <button className={`glass-button ${className}`} {...props}>{children}</button>;
}

function Avatar({ name, tone = "green", you = false }) {
  return (
    <span className={`avatar avatar--${tone}${you ? " avatar--you" : ""}`} aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function PeoplePanel({ playerName, remoteCount, onClose }) {
  const total = remoteCount + 1;
  return (
    <aside className="floating-panel people-panel">
      <div className="panel-heading">
        <div><span className="panel-kicker">PEOPLE IN ROOM</span><h2>{total} / 20</h2></div>
        <GlassButton aria-label="Close people panel" onClick={onClose}>×</GlassButton>
      </div>
      <div className="people-search"><Icon name="search" size={16} /><input placeholder="Find someone..." /></div>
      <div className="people-list">
        <div className="person-row person-row--you"><Avatar name={playerName || "You"} tone="red" you /><div><b>{playerName || "You"} <em>YOU</em></b><small>0m · In your space</small></div><span className="person-state person-state--yellow" /></div>
        {peoplePreview.slice(0, 6).map((person) => (
          <div className="person-row" key={person.name}>
            <Avatar name={person.name} tone={person.tone} />
            <div><b>{person.name}</b><small>{person.distance}m · {person.mic ? "Voice nearby" : "Muted"}</small></div>
            <span className={`person-state person-state--${person.tone}`} />
          </div>
        ))}
        {remoteCount === 0 && <div className="people-empty">Remote presence is being wired into this view.</div>}
      </div>
    </aside>
  );
}

function MiniMap({ position, onClose }) {
  const x = Math.max(5, Math.min(95, (position.x / WORLD_WIDTH) * 100));
  const y = Math.max(5, Math.min(95, (position.y / WORLD_HEIGHT) * 100));
  return (
    <aside className="floating-panel map-panel">
      <div className="mini-map__top"><span>Floor 1</span><GlassButton onClick={onClose} aria-label="Close map">×</GlassButton></div>
      <div className="mini-map">
        <div className="mini-map__rooms mini-map__rooms--a" />
        <div className="mini-map__rooms mini-map__rooms--b" />
        <div className="mini-map__rooms mini-map__rooms--c" />
        <i className="mini-dot mini-dot--red" style={{ left: "49%", top: "50%" }} />
        <i className="mini-dot mini-dot--green" style={{ left: `${x}%`, top: `${y}%` }} />
        <i className="mini-dot mini-dot--yellow" style={{ left: "69%", top: "35%" }} />
        <span className="mini-map__you">YOU</span>
      </div>
      <div className="mini-map__legend"><span><i className="legend-dot legend-dot--green" /> Nearby</span><span><i className="legend-dot legend-dot--red" /> You</span></div>
    </aside>
  );
}

function SettingsPanel({ transparency, setTransparency, onClose }) {
  return (
    <aside className="floating-panel settings-panel">
      <div className="panel-heading"><div><span className="panel-kicker">WORKSPACE</span><h2>Appearance</h2></div><GlassButton onClick={onClose} aria-label="Close settings">×</GlassButton></div>
      <div className="setting-row">
        <div><b>Glass transparency</b><small>Adjust how much of the world shows through the interface.</small></div>
        <strong>{Math.round(transparency * 100)}%</strong>
      </div>
      <input className="transparency-slider" type="range" min="0.38" max="0.88" step="0.01" value={transparency} onChange={(e) => setTransparency(Number(e.target.value))} />
      <div className="setting-scale"><span>More transparent</span><span>More solid</span></div>
      <div className="setting-note"><span>Preview</span><div className="glass-preview">PROXYSPEAK</div></div>
      <div className="setting-row setting-row--plain"><div><b>Motion</b><small>Keep subtle interface transitions enabled.</small></div><span className="setting-switch is-on">ON</span></div>
      <div className="setting-row setting-row--plain"><div><b>Proximity radius</b><small>Show the 90u visual range in the world.</small></div><span className="setting-switch is-on">90u</span></div>
    </aside>
  );
}

function TopBar({ status, playerCount, transparency, onPeople, onMap, onSettings }) {
  return (
    <header className="workspace-topbar glass-surface">
      <Brand />
      <div className="workspace-topbar__center">
        <button className="workspace-select glass-button"><span className="workspace-thumb">EL</span><span><b>Executive Lounge</b><small>Shared workspace</small></span><span>⌄</span></button>
        <div className="top-stat glass-button"><Icon name="people" size={19} /><b>{playerCount} / 20</b></div>
        <div className={`connection-chip glass-button ${status === "Joined" ? "is-online" : ""}`}><span className="connection-light" /><b>{status === "Joined" ? "Connected" : status}</b><span className="latency">42 ms</span></div>
      </div>
      <div className="workspace-topbar__actions">
        <GlassButton onClick={onPeople} aria-label="People"><Icon name="chat" /></GlassButton>
        <GlassButton onClick={onMap} aria-label="Map"><Icon name="map" /></GlassButton>
        <GlassButton onClick={onSettings} aria-label="Settings"><Icon name="settings" /></GlassButton>
        <div className="profile-avatar"><Avatar name="S" tone="red" you /><span /></div>
      </div>
    </header>
  );
}

function JoinCard({ playerName, setPlayerName, isJoined, isConnecting, error, onJoin, onLeave }) {
  if (isJoined) return null;
  return (
    <div className="join-overlay glass-surface">
      <span className="panel-kicker">ENTER THE ROOM</span>
      <h1>Be closer. <em>Talk naturally.</em></h1>
      <p>Choose a display name to enter the Executive Lounge.</p>
      <div className="join-form">
        <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Your name" maxLength={20} />
        <button className="join-primary" onClick={onJoin} disabled={isConnecting}>{isConnecting ? "Joining…" : "Enter workspace"} <span>→</span></button>
      </div>
      {error && <div className="join-error">{error}</div>}
      <small>1–20 characters · Your microphone is not requested yet</small>
    </div>
  );
}

function BottomDock({ muted, setMuted, onReset, showProximityZone, setShowProximityZone }) {
  return (
    <div className="bottom-dock glass-surface">
      <GlassButton className={muted ? "dock-action is-muted" : "dock-action"} onClick={() => setMuted((v) => !v)}><Icon name="mic" /><small>{muted ? "Muted" : "Mic (Mock)"}</small></GlassButton>
      <GlassButton className="dock-action" onClick={() => {}}><Icon name="video" /><small>Simulate Permission</small></GlassButton>
      <button className="push-talk" onMouseDown={() => {}}><Icon name="mic" size={27} /><span>Push to Talk</span></button>
      <GlassButton className="dock-action" onClick={() => {}}><Icon name="smile" /><small>Emotes</small></GlassButton>
      <GlassButton className={`dock-action ${showProximityZone ? "is-active" : ""}`} onClick={() => setShowProximityZone((v) => !v)}><Icon name="map" /><small>Map</small></GlassButton>
      <GlassButton className="dock-action" onClick={onReset}><Icon name="more" /><small>More</small></GlassButton>
    </div>
  );
}

export default function App() {
  const [playerName, setPlayerName] = useState("");
  const [showProximityZone, setShowProximityZone] = useState(true);
  const [playerId, setPlayerId] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");
  const [panel, setPanel] = useState(null);
  const [transparency, setTransparency] = useState(0.68);
  const [muted, setMuted] = useState(false);
  const nameRef = useRef("");
  const joinFailedRef = useRef(false);

  const [remotePlayers] = useState([]);
  const { position, heading, activeKeys, resetPosition } = useMovement();

  useEffect(() => { nameRef.current = playerName; }, [playerName]);

  useEffect(() => {
    function handleConnect() {
      setStatus("Connected");
      setError("");
      socket.emit("join-world", { name: nameRef.current.trim() });
    }
    function handleWorldJoined(player) {
      setPlayerId(player.playerId);
      setStatus("Joined");
      setError("");
    }
    function handleJoinError(payload) {
      joinFailedRef.current = true;
      setError(payload.message);
      setStatus("Join failed");
      setPlayerId("");
      socket.disconnect();
    }
    function handleDisconnect() {
      setPlayerId("");
      if (!joinFailedRef.current) setStatus("Disconnected");
    }
    socket.on("connect", handleConnect);
    socket.on("world-joined", handleWorldJoined);
    socket.on("join-error", handleJoinError);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("world-joined", handleWorldJoined);
      socket.off("join-error", handleJoinError);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  function handleConnectClick() {
    const trimmed = playerName.trim();
    if (!trimmed) return setError("Enter a name before joining.");
    if (trimmed.length > 20) return setError("Name must be between 1 and 20 characters.");
    nameRef.current = trimmed;
    joinFailedRef.current = false;
    setError("");
    setStatus("Connecting...");
    socket.connect();
  }

  function handleLeave() {
    if (socket.connected) {
      socket.emit("leave-world");
      socket.disconnect();
    }
    setPanel(null);
  }

  const isJoined = Boolean(playerId);
  const isConnecting = status === "Connecting..." || status === "Connected";
  const playerCount = remotePlayers.length + (isJoined ? 1 : 0);
  const cssVars = useMemo(() => ({ "--glass-alpha": transparency }), [transparency]);

  return (
    <main className="workspace-app" style={cssVars}>
      <div className="workspace-backdrop" aria-hidden="true" />
      <div className="workspace-world">
        <WorldCanvas position={position} heading={heading} playerName={playerName || "You"} remotePlayers={remotePlayers} showProximityZone={showProximityZone} />
      </div>

      <TopBar status={status} playerCount={playerCount} transparency={transparency} onPeople={() => setPanel("people")} onMap={() => setPanel("map")} onSettings={() => setPanel("settings")} />

      <aside className="workspace-sidebar glass-surface">
        <div className="sidebar-nav">
          <button className="sidebar-nav__item is-active"><Icon name="home" /><span>Lounge</span></button>
          <button className="sidebar-nav__item" onClick={() => setPanel("people")}><Icon name="people" /><span>People</span>{remotePlayers.length > 0 && <b>{remotePlayers.length + 1}</b>}</button>
          <button className="sidebar-nav__item" onClick={() => setPanel("map")}><Icon name="map" /><span>Map</span></button>
          <button className="sidebar-nav__item" onClick={() => setPanel("settings")}><Icon name="settings" /><span>Settings</span></button>
        </div>
        <div className="sidebar-room glass-inner">
          <div className="room-thumb">EL</div>
          <div><b>Executive Lounge</b><p>A casual space to hang out, discuss ideas, or just vibe with your team.</p></div>
          <span>⌄</span>
        </div>
        <button className="invite-button glass-button"><Icon name="link" size={17} /> Invite People</button>
        <div className="sidebar-people">
          <div className="sidebar-people__heading"><b>People in Room ({playerCount})</b><Icon name="search" size={16} /></div>
          <div className="sidebar-people__list">
            <div className="mini-person is-you"><Avatar name={playerName || "You"} tone="red" you /><span>{playerName || "You"} <em>YOU</em></span><i /></div>
            {peoplePreview.slice(0, 5).map((person) => <div className="mini-person" key={person.name}><Avatar name={person.name} tone={person.tone} /><span>{person.name}</span><i className={`person-state--${person.tone}`} /></div>)}
          </div>
        </div>
      </aside>

      <div className="world-copy">
        <span className="world-copy__kicker">EXECUTIVE LOUNGE · FLOOR 1</span>
        <h1>Good people.<br /><em>Great conversations.</em></h1>
        <p>Move closer to hear. Move away to let the conversation breathe.</p>
      </div>

      {!isJoined && <JoinCard playerName={playerName} setPlayerName={setPlayerName} isJoined={isJoined} isConnecting={isConnecting} error={error} onJoin={handleConnectClick} onLeave={handleLeave} />}

      <div className="world-range-label glass-inner">
        <span>Voice Range</span><b>{AUDIO_RADIUS}u</b><small>Visual only</small>
      </div>

      <BottomDock muted={muted} setMuted={setMuted} onReset={resetPosition} showProximityZone={showProximityZone} setShowProximityZone={setShowProximityZone} />

      <div className="range-control glass-surface">
        <div><span>Voice Range <small>(Visual Only)</small></span><b>{AUDIO_RADIUS}u</b></div>
        <input type="range" min="30" max="150" value={AUDIO_RADIUS} readOnly />
        <p>Proximity voice and real audio coming later.</p>
      </div>

      <div className="workspace-footer glass-inner">
        <span>Player <b>{playerId || "—"}</b></span>
        <span>{Math.round(position.x)} × {Math.round(position.y)}</span>
        <span>{SERVER_URL}</span>
      </div>

      {panel === "people" && <PeoplePanel playerName={playerName} remoteCount={remotePlayers.length} onClose={() => setPanel(null)} />}
      {panel === "map" && <MiniMap position={position} onClose={() => setPanel(null)} />}
      {panel === "settings" && <SettingsPanel transparency={transparency} setTransparency={setTransparency} onClose={() => setPanel(null)} />}

      <div className="sr-only" aria-live="polite">{activeKeys && Object.keys(activeKeys).length ? "Movement active" : ""}</div>
    </main>
  );
}
