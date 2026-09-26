import { useState } from "react";

// Static UI mock for Week 1 — no real WebRTC/audio logic yet.
// Demonstrates mic permission states and mute button design.
export default function AudioMockUI() {
  const [micState, setMicState] = useState("not-requested");
  const [muted, setMuted] = useState(false);

  const micStateLabels = {
    "not-requested": "Microphone not enabled",
    requesting: "Waiting for permission…",
    granted: "Microphone active",
    denied: "Microphone blocked — enable it in browser settings",
    "no-device": "No microphone detected",
  };

  return (
    <div className="audio-mock">
      <h3>Audio Controls</h3>

      <div className="audio-mock__mic-state">
        <span>{micStateLabels[micState]}</span>
      </div>

      {micState === "not-requested" && (
        <button onClick={() => setMicState("requesting")}>
          Enable Microphone
        </button>
      )}

      {micState === "requesting" && (
        <div className="audio-mock__buttons">
          <button onClick={() => setMicState("granted")}>
            Simulate: Allow
          </button>
          <button onClick={() => setMicState("denied")}>
            Simulate: Deny
          </button>
          <button onClick={() => setMicState("no-device")}>
            Simulate: No Device
          </button>
        </div>
      )}

      {micState === "granted" && (
        <button
          className={muted ? "button--muted" : "button--active"}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      )}

      {(micState === "denied" || micState === "no-device") && (
        <button onClick={() => setMicState("not-requested")}>
          Try Again
        </button>
      )}

      <div className="audio-mock__connection">
        <span className="dot dot--connecting" /> Peer: connecting
      </div>
    </div>
  );
}