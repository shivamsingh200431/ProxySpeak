import { useState } from "react";

// Static UI mock for Week 1 — no real WebRTC/audio logic yet.
// All microphone permission actions below are simulated.
export default function AudioMockUI() {
  const [micState, setMicState] = useState("not-requested");
  const [muted, setMuted] = useState(false);

  const micStateLabels = {
    "not-requested": "Microphone not enabled",
    requesting: "Waiting for permission (simulated)",
    granted: "Microphone active (simulated)",
    denied: "Microphone blocked (simulated)",
    "no-device": "No microphone detected (simulated)",
  };

  return (
    <div className="audio-mock" aria-label="Audio controls mock">
      <div className="audio-mock__header">
        <div>
          <h3>Audio Controls</h3>
          <p>UI prototype — microphone and WebRTC are not connected yet.</p>
        </div>
        <span className="audio-mock__badge">MOCK</span>
      </div>

      <div className="audio-mock__mic-state">
        <span className="audio-mock__label">Microphone</span>
        <strong>{micStateLabels[micState]}</strong>
      </div>

      {micState === "not-requested" && (
        <button type="button" onClick={() => setMicState("requesting")}>
          Simulate Microphone Request
        </button>
      )}

      {micState === "requesting" && (
        <div className="audio-mock__buttons">
          <button type="button" onClick={() => setMicState("granted")}>
            Simulate: Allow
          </button>
          <button type="button" onClick={() => setMicState("denied")}>
            Simulate: Deny
          </button>
          <button type="button" onClick={() => setMicState("no-device")}>
            Simulate: No Device
          </button>
        </div>
      )}

      {micState === "granted" && (
        <button
          type="button"
          className={muted ? "button--muted" : "button--active"}
          onClick={() => setMuted((m) => !m)}
        >
          {muted ? "Unmute (mock)" : "Mute (mock)"}
        </button>
      )}

      {(micState === "denied" || micState === "no-device") && (
        <button type="button" onClick={() => setMicState("not-requested")}>
          Try Again (mock)
        </button>
      )}

      <div className="audio-mock__connection">
        <span className="dot dot--connecting" aria-hidden="true" />
        <span>Peer: connecting (mock)</span>
      </div>
    </div>
  );
}
