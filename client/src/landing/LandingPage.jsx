import { useEffect, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

const people = [
  { name: "MAYA", role: "Product", x: 22, y: 34, color: "red" },
  { name: "ALEX", role: "Engineering", x: 58, y: 29, color: "white" },
  { name: "PRIYA", role: "Design", x: 76, y: 67, color: "yellow" },
  { name: "JORDAN", role: "Marketing", x: 42, y: 72, color: "white" },
];

function Reveal({ children, className = "", delay = 0, y = 28 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ActionLink({ children, href = "/app", className = "" }) {
  return (
    <motion.a
      className={className}
      href={href}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
    >
      {children}
    </motion.a>
  );
}

function Brand() {
  return (
    <span className="brand-mark-wrap">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>PROXYSPEAK</span>
    </span>
  );
}

function PersonDot({ person, active }) {
  return (
    <div
      className={`space-person space-person--${person.color}${active ? " is-active" : ""}`}
      style={{ left: `${person.x}%`, top: `${person.y}%` }}
    >
      <span className="space-person__halo" />
      <span className="space-person__head" />
      <span className="space-person__body" />
      <span className="space-person__label">
        <b>{person.name}</b>
        <small>{person.role}</small>
      </span>
    </div>
  );
}

function ProximityLab() {
  const [distance, setDistance] = useState(42);
  const level = distance <= 28 ? "Conversation" : distance <= 62 ? "Nearby" : "Out of range";
  const volume = Math.max(0, Math.round((1 - distance / 100) * 100));
  const activePeople = distance <= 62 ? 2 : 0;

  return (
    <section className="lab-section" id="demo">
      <div className="section-shell lab-layout">
        <Reveal className="lab-copy">
          <span className="section-kicker">02 / TRY THE IDEA</span>
          <h2>Distance is not decoration. <em>It changes the conversation.</em></h2>
          <p>
            This is the core interaction ProxySpeak is being built around. Move
            through a shared space, cross a person's range, and the audio state changes with you.
          </p>

          <div className="lab-readout" aria-live="polite">
            <div><span>VOICE STATE</span><strong>{level}</strong></div>
            <div><span>EST. VOICE LEVEL</span><strong>{volume}%</strong></div>
            <div><span>PEOPLE IN RANGE</span><strong>{activePeople}</strong></div>
          </div>
        </Reveal>

        <Reveal className="lab-card" delay={0.08}>
          <div className="lab-card__top">
            <span>PROXIMITY LAB / LIVE MODEL</span>
            <span><i className="status-dot status-dot--green" /> SIMULATION</span>
          </div>

          <div className="lab-space">
            <div className="lab-grid" />
            <div className="lab-room lab-room--one">LOUNGE</div>
            <div className="lab-room lab-room--two">FOCUS</div>
            <div className="lab-table lab-table--one" />
            <div className="lab-table lab-table--two" />
            <div
              className="lab-range"
              style={{
                width: `${Math.max(120, 260 - distance * 0.75)}px`,
                height: `${Math.max(120, 260 - distance * 0.75)}px`,
              }}
            />

            <div className="lab-you" style={{ left: `${Math.min(82, 26 + distance * 0.45)}%` }}>
              <span className="lab-you__halo" />
              <span className="lab-you__head" />
              <span className="lab-you__body" />
              <span className="lab-you__label">YOU</span>
            </div>

            <div className="lab-person lab-person--maya">
              <span className="lab-person__head" />
              <span className="lab-person__body" />
              <span>MAYA</span>
            </div>

            <div className={`lab-audio ${distance <= 62 ? "is-active" : ""}`}>
              <span /><span /><span />
            </div>
          </div>

          <div className="lab-card__bottom">
            <label htmlFor="distance-demo">
              <span>YOUR DISTANCE</span>
              <strong>{distance}u</strong>
            </label>
            <input
              id="distance-demo"
              type="range"
              min="8"
              max="100"
              value={distance}
              onChange={(event) => setDistance(Number(event.target.value))}
              aria-label="Your distance from Maya"
            />
            <div className="lab-scale"><span>0u / CLOSE</span><span>90u / RANGE</span><span>100u / AWAY</span></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function OfficePreview() {
  return (
    <div className="office-preview" aria-label="ProxySpeak virtual office preview">
      <div className="office-preview__bar">
        <span>WORKSPACE 001</span>
        <span>6 PEOPLE ONLINE</span>
      </div>
      <div className="office-preview__canvas">
        <div className="office-grid" />
        <div className="office-wall office-wall--a" />
        <div className="office-wall office-wall--b" />
        <div className="office-wall office-wall--c" />
        <div className="office-room-label office-room-label--a">LOUNGE</div>
        <div className="office-room-label office-room-label--b">BOARDROOM</div>
        <div className="office-room-label office-room-label--c">FOCUS AREA</div>
        <div className="office-desk office-desk--a" />
        <div className="office-desk office-desk--b" />
        <div className="office-desk office-desk--c" />
        {people.map((person, index) => (
          <PersonDot key={person.name} person={person} active={index === 0} />
        ))}
        <div className="office-path office-path--one" />
        <div className="office-path office-path--two" />
      </div>
      <div className="office-preview__footer">
        <span><i className="status-dot status-dot--green" /> WORLD ONLINE</span>
        <span>MOVE / EXPLORE / TALK</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  useEffect(() => {
    document.body.classList.add("landing-mode");

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      smoothWheel: true,
      wheelMultiplier: 0.9,
      syncTouch: true,
      touchMultiplier: 1,
      stopInertiaOnNavigate: true,
    });

    return () => {
      lenis.destroy();
      document.body.classList.remove("landing-mode");
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-page">
        <div className="landing-grid-glow" aria-hidden="true" />
        <div className="landing-noise" aria-hidden="true" />

        <header className="landing-nav">
          <a className="brand" href="#top" aria-label="ProxySpeak home"><Brand /></a>
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#demo">Try the idea</a>
            <a href="#workspace">Workspace</a>
          </nav>
          <ActionLink className="nav-cta" href="/app">Enter workspace <span>↗</span></ActionLink>
        </header>

        <main>
          <section className="landing-hero" id="top">
            <div className="hero-shell">
              <Reveal className="hero-copy" y={34}>
                <div className="hero-eyebrow"><i className="status-dot status-dot--red" /> PROXIMITY-BASED VOICE</div>
                <h1>Talk to people <span>near you.</span></h1>
                <p>
                  A shared digital workplace where location shapes communication.
                  Walk closer, talk naturally. Walk away, and the conversation fades.
                </p>
                <div className="hero-actions">
                  <ActionLink className="primary-cta" href="/app">Enter ProxySpeak <span>→</span></ActionLink>
                  <a className="text-cta" href="#how-it-works">See how it works <span>↓</span></a>
                </div>
                <div className="hero-facts">
                  <div><strong>90u</strong><span>voice range</span></div>
                  <div><strong>REAL-TIME</strong><span>shared presence</span></div>
                  <div><strong>WEBRTC</strong><span>audio foundation</span></div>
                </div>
              </Reveal>

              <Reveal className="hero-stage" delay={0.1} y={38}>
                <OfficePreview />
              </Reveal>
            </div>
            <a className="hero-scroll" href="#how-it-works"><span>SCROLL TO EXPLORE</span><i /></a>
          </section>

          <section className="intro-section" id="how-it-works">
            <div className="section-shell intro-layout">
              <Reveal><span className="section-kicker">01 / THE IDEA</span></Reveal>
              <Reveal className="intro-title" delay={0.05}>
                <h2>Most collaboration tools flatten the room. <em>ProxySpeak gives it space.</em></h2>
              </Reveal>
              <Reveal className="intro-copy" delay={0.1}>
                <p>
                  Instead of putting everyone into one permanent call, ProxySpeak makes
                  proximity the interaction. Presence is visible. Distance is meaningful.
                  Conversation can happen without another calendar invite.
                </p>
              </Reveal>
            </div>
          </section>

          <section className="steps-section">
            <div className="section-shell">
              <div className="steps-heading">
                <Reveal><span className="section-kicker">THE LOOP</span></Reveal>
                <Reveal delay={0.05}><h2>Four simple states. <em>One natural interaction.</em></h2></Reveal>
              </div>

              <div className="steps-grid">
                {[
                  ["01", "MOVE", "Walk through a shared workspace.", "Your position is part of the experience."],
                  ["02", "ARRIVE", "Enter someone's proximity range.", "Nearby people become relevant to you."],
                  ["03", "TALK", "Start a natural conversation.", "Voice follows the social space around you."],
                  ["04", "LEAVE", "Create distance again.", "The connection softens as you move away."],
                ].map(([number, label, title, copy], index) => (
                  <Reveal key={number} className={`step-card${index === 2 ? " step-card--accent" : ""}`} delay={index * 0.05}>
                    <div className="step-card__number">{number}</div>
                    <span className="step-card__label">{label}</span>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                    <div className={`step-graphic step-graphic--${index + 1}`} aria-hidden="true">
                      <span /><span /><span />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <ProximityLab />

          <section className="workspace-section" id="workspace">
            <div className="section-shell workspace-layout">
              <Reveal className="workspace-copy">
                <span className="section-kicker">03 / THE WORKSPACE</span>
                <h2>A virtual office with <em>a sense of place.</em></h2>
                <p>
                  Lounges, focus areas, meeting rooms and open space give teams a shared
                  mental map. You do not just join a call — you know where people are.
                </p>
                <div className="workspace-list">
                  <div><span>01</span><strong>Presence</strong><small>See who is around.</small></div>
                  <div><span>02</span><strong>Rooms</strong><small>Move between useful spaces.</small></div>
                  <div><span>03</span><strong>Proximity</strong><small>Let distance guide interaction.</small></div>
                </div>
                <ActionLink className="secondary-cta" href="/app">Open the workspace <span>↗</span></ActionLink>
              </Reveal>
              <Reveal className="workspace-visual" delay={0.08}>
                <OfficePreview />
              </Reveal>
            </div>
          </section>

          <section className="tech-section" id="technology">
            <div className="section-shell">
              <Reveal className="tech-heading">
                <span className="section-kicker">04 / THE SYSTEM</span>
                <h2>Simple on the surface. <em>Deliberate underneath.</em></h2>
              </Reveal>
              <div className="tech-grid">
                {[
                  ["01", "REAL-TIME", "Socket.io", "Presence and movement stay synchronized across the shared world."],
                  ["02", "SPATIAL", "Proximity logic", "A defined world-space threshold determines who belongs in the conversation."],
                  ["03", "PEER AUDIO", "WebRTC", "Peer-to-peer audio forms the foundation for lightweight conversations."],
                  ["04", "AUDIO", "Web Audio", "Distance-aware processing will make nearby voices feel present and farther voices quieter."],
                ].map(([number, label, title, copy], index) => (
                  <Reveal key={number} className="tech-card" delay={index * 0.05}>
                    <span className="tech-card__number">{number}</span>
                    <span className="tech-card__label">{label}</span>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                    <span className="tech-card__line" />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          <section className="final-section">
            <Reveal className="final-card">
              <span className="section-kicker">THE NEXT STEP</span>
              <h2>Make the room <em>feel alive.</em></h2>
              <p>Enter the prototype and experience the shared world that ProxySpeak is building.</p>
              <ActionLink className="primary-cta primary-cta--large" href="/app">Enter ProxySpeak <span>→</span></ActionLink>
            </Reveal>
          </section>
        </main>

        <footer className="landing-footer">
          <a className="brand" href="#top"><Brand /></a>
          <span>PROXIMITY-BASED VOICE COLLABORATION</span>
          <span>© 2026 PROXYSPEAK</span>
        </footer>
      </div>
    </MotionConfig>
  );
}
