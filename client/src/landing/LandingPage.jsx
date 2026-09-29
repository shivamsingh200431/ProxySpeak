import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

const people = [
  { name: "MAYA", role: "Product", x: "25%", y: "34%", state: "near" },
  { name: "ALEX", role: "Engineering", x: "61%", y: "26%", state: "near" },
  { name: "PRIYA", role: "Design", x: "76%", y: "67%", state: "far" },
  { name: "JORDAN", role: "Marketing", x: "43%", y: "72%", state: "far" },
];

function MotionReveal({ children, className = "", delay = 0, y = 42 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function MagneticCTA({ children, className = "", href = "/app" }) {
  return (
    <motion.a
      className={className}
      href={href}
      whileHover={{ y: -4, scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
    >
      {children}
    </motion.a>
  );
}

function Reveal({ children, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.14 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`landing-reveal ${className}`}>
      {children}
    </div>
  );
}


function CinematicTransition({ eyebrow, word, title, copy, accent = "red" }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const rawProgress = Math.min(1, Math.max(0, -rect.top / rect.height));
      const progress = Math.min(1, Math.max(0, (rawProgress - 0.04) / 0.58));

      node.style.setProperty("--cinematic-progress", progress.toFixed(4));
      frame = 0;
    };

    const handleScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <section
      ref={ref}
      className={`cinematic-transition cinematic-transition--${accent}`}
      aria-label={title}
    >
      <div className="cinematic-sticky">
        <div className="cinematic-grid" aria-hidden="true" />
        <div className="cinematic-word" aria-hidden="true">{word}</div>
        <div className="cinematic-scan" aria-hidden="true" />
        <div className="cinematic-copy">
          <span className="section-kicker">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{copy}</p>
        </div>
        <div className="cinematic-meter" aria-hidden="true">
          <span>SCROLL PROGRESS</span>
          <i />
        </div>
      </div>
    </section>
  );
}

function Person({ person, index }) {
  return (
    <div
      className={`demo-person demo-person--${person.state}`}
      style={{ left: person.x, top: person.y, animationDelay: `${index * -1.4}s` }}
    >
      <span className="demo-person__pulse" />
      <span className="demo-person__head" />
      <span className="demo-person__body" />
      <span className="demo-person__name">{person.name}</span>
      <span className="demo-person__role">{person.role}</span>
    </div>
  );
}

export default function LandingPage() {
  useEffect(() => {
    document.body.classList.add("landing-mode");

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      duration: 1.25,
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.05,
    });

    return () => {
      lenis.destroy();
      document.body.classList.remove("landing-mode");
    };
  }, []);

  return (
    <div className="landing-page">
      <div className="landing-noise" aria-hidden="true" />
      <div className="landing-orbit landing-orbit--one" aria-hidden="true" />
      <div className="landing-orbit landing-orbit--two" aria-hidden="true" />

      <header className="landing-nav">
        <a className="brand" href="/" aria-label="ProxySpeak home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>PROXYSPEAK</span>
        </a>

        <nav className="landing-nav__links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#experience">Experience</a>
          <a href="#technology">Technology</a>
        </nav>

        <MagneticCTA className="nav-cta" href="/app">
          Enter workspace <span>↗</span>
        </MagneticCTA>
      </header>

      <main>
        <section className="landing-hero" id="top">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
            }}
          >
            <motion.div className="live-pill" variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}>
              <span className="live-dot" />
              PROXIMITY-BASED VOICE
            </motion.div>

            <motion.h1 variants={{ hidden: { opacity: 0, y: 32, filter: "blur(10px)" }, visible: { opacity: 1, y: 0, filter: "blur(0px)" } }}>
              <span>Talk to people</span>
              <span className="hero-accent">near you.</span>
            </motion.h1>

            <motion.p variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}>
              ProxySpeak turns distance into a communication layer. Walk closer,
              start talking. Walk away, the conversation fades naturally.
            </p>

            <motion.div className="hero-actions" variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}>
              <MagneticCTA className="primary-cta" href="/app">
                Enter ProxySpeak
                <span>→</span>
              </MagneticCTA>
              <a className="text-cta" href="#how-it-works">
                See how it works
                <span>↓</span>
              </a>
            </motion.div>

            <motion.div className="hero-proof" variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}>
              <div className="proof-item">
                <strong>90u</strong>
                <span>proximity range</span>
              </div>
              <div className="proof-divider" />
              <div className="proof-item">
                <strong>REAL-TIME</strong>
                <span>shared spaces</span>
              </div>
              <div className="proof-divider" />
              <div className="proof-item">
                <strong>WEBRTC</strong>
                <span>voice layer</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, y: 50, rotateX: 8, rotateY: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotateX: 2, rotateY: -4, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-visual__topline">
              <span>LIVE SPACE / EXECUTIVE LOUNGE</span>
              <span><i className="mini-dot" /> 8 PEOPLE</span>
            </div>

            <div className="office-window">
              <div className="office-window__grid" />
              <div className="office-room office-room--one">
                <span>MEETING ROOM</span>
              </div>
              <div className="office-room office-room--two">
                <span>FOCUS AREA</span>
              </div>
              <div className="office-table office-table--one" />
              <div className="office-table office-table--two" />

              <div className="voice-zone" />
              <div className="voice-zone__label">
                <span>VOICE RANGE</span>
                <strong>90u</strong>
              </div>

              {people.map((person, index) => (
                <Person key={person.name} person={person} index={index} />
              ))}

              <div className="hero-avatar">
                <span className="hero-avatar__halo" />
                <span className="hero-avatar__head" />
                <span className="hero-avatar__body" />
                <span className="hero-avatar__tag">
                  <b>YOU</b>
                  <small>speaking</small>
                </span>
              </div>

              <div className="audio-radar">
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="hero-visual__bottom">
              <span><i className="signal-bars"><b /><b /><b /></i> Audio active</span>
              <span>Move closer to connect</span>
            </div>
          </motion.div>

          <div className="hero-scroll">
            <span>SCROLL TO EXPLORE</span>
            <i />
          </div>
        </section>

        <CinematicTransition
          eyebrow="01 / THE PHYSICAL LAYER"
          word="DISTANCE"
          title={<>Distance <em>is the interface.</em></>}
          copy="ProxySpeak turns an invisible measurement into something you can feel: move closer and the relationship becomes stronger."
        />

        <section className="statement-section" id="how-it-works">
          <Reveal className="section-inner">
            <div className="section-kicker">01 / THE IDEA</div>
            <h2>
              Your location becomes
              <em> the conversation.</em>
            </h2>
            <p>
              Traditional meeting tools put everyone in the same audio room.
              ProxySpeak makes the room spatial. Presence has distance, and
              distance has meaning.
            </p>
          </Reveal>
        </section>

        <section className="steps-section">
          <div className="steps-line" aria-hidden="true" />
          <Reveal className="step-card step-card--active">
            <span className="step-number">01</span>
            <div className="step-visual step-visual--move">
              <div className="mini-person mini-person--red" />
              <div className="mini-person mini-person--white" />
              <div className="mini-arrow">→</div>
            </div>
            <div>
              <span className="step-label">MOVE</span>
              <h3>Walk into someone's space.</h3>
              <p>Navigate a shared virtual environment just like a real workplace.</p>
            </div>
          </Reveal>

          <Reveal className="step-card">
            <span className="step-number">02</span>
            <div className="step-visual step-visual--range">
              <div className="range-circle" />
              <div className="mini-person mini-person--red mini-person--center" />
              <div className="range-person">ALEX</div>
            </div>
            <div>
              <span className="step-label">CONNECT</span>
              <h3>Enter the proximity range.</h3>
              <p>The space around a person becomes a natural voice boundary.</p>
            </div>
          </Reveal>

          <Reveal className="step-card">
            <span className="step-number">03</span>
            <div className="step-visual step-visual--voice">
              <div className="wave wave--one" />
              <div className="wave wave--two" />
              <div className="wave wave--three" />
              <span className="voice-icon">◖</span>
            </div>
            <div>
              <span className="step-label">TALK</span>
              <h3>Have a natural conversation.</h3>
              <p>Nearby voices become part of your space without another call to join.</p>
            </div>
          </Reveal>

          <Reveal className="step-card">
            <span className="step-number">04</span>
            <div className="step-visual step-visual--fade">
              <div className="fade-person" />
              <div className="fade-lines" />
            </div>
            <div>
              <span className="step-label">LEAVE</span>
              <h3>Walk away. The room changes.</h3>
              <p>Distance naturally reduces the relationship between people.</p>
            </div>
          </Reveal>
        </section>

        <CinematicTransition
          eyebrow="02 / THE SOCIAL LAYER"
          word="SPACE"
          title={<>A room you can <em>move through.</em></>}
          copy="The page shifts from product idea to product experience — typography pulls back, and the workspace comes forward."
          accent="yellow"
        />

        <section className="experience-section" id="experience">
          <Reveal className="experience-heading">
            <div>
              <span className="section-kicker">02 / THE EXPERIENCE</span>
              <h2>A virtual workplace<br /><em>with a sense of place.</em></h2>
            </div>
            <p>
              Designed for teams that want the spontaneity of an office without
              sacrificing the flexibility of remote work.
            </p>
          </Reveal>

          <Reveal className="experience-stage">
            <div className="experience-stage__header">
              <span>PROXYSPEAK / WORKSPACE 001</span>
              <span>THURSDAY / 10:42 AM</span>
            </div>
            <div className="experience-map">
              <div className="map-grid" />
              <div className="map-wall map-wall--a" />
              <div className="map-wall map-wall--b" />
              <div className="map-wall map-wall--c" />
              <div className="map-room map-room--a">LOUNGE</div>
              <div className="map-room map-room--b">BOARDROOM</div>
              <div className="map-room map-room--c">FOCUS</div>
              <div className="map-desk desk--1" />
              <div className="map-desk desk--2" />
              <div className="map-desk desk--3" />
              <div className="map-desk desk--4" />
              <div className="map-person map-person--1"><span>MAYA</span></div>
              <div className="map-person map-person--2"><span>JORDAN</span></div>
              <div className="map-person map-person--3"><span>YOU</span></div>
              <div className="map-proximity">
                <span />
                <b>2 PEOPLE IN RANGE</b>
              </div>
            </div>
            <div className="experience-stage__footer">
              <span><i className="status-green" /> Workspace online</span>
              <span>Move / Explore / Talk</span>
            </div>
          </Reveal>
        </section>

        <section className="technology-section" id="technology">
          <Reveal className="tech-heading">
            <span className="section-kicker">03 / UNDER THE HOOD</span>
            <h2>Simple on the surface.<br /><em>Serious underneath.</em></h2>
          </Reveal>

          <div className="tech-grid">
            <Reveal className="tech-card tech-card--large">
              <span className="tech-index">01</span>
              <div className="tech-icon tech-icon--signal"><i /><i /><i /></div>
              <span className="tech-label">REAL-TIME PRESENCE</span>
              <h3>Everyone has a place.</h3>
              <p>Shared world state keeps movement and presence synchronized between connected people.</p>
              <div className="tech-line"><span /></div>
            </Reveal>

            <Reveal className="tech-card">
              <span className="tech-index">02</span>
              <div className="tech-icon tech-icon--range">90</div>
              <span className="tech-label">PROXIMITY LOGIC</span>
              <h3>Distance becomes a signal.</h3>
              <p>A defined spatial threshold determines who belongs in your conversational space.</p>
            </Reveal>

            <Reveal className="tech-card">
              <span className="tech-index">03</span>
              <div className="tech-icon tech-icon--voice">◉</div>
              <span className="tech-label">WEBRTC AUDIO</span>
              <h3>Voice without the room.</h3>
              <p>Peer-to-peer audio forms the foundation for lightweight, natural conversations.</p>
            </Reveal>

            <Reveal className="tech-card tech-card--wide">
              <span className="tech-index">04</span>
              <div>
                <span className="tech-label">WEB AUDIO</span>
                <h3>Even volume can have distance.</h3>
                <p>Distance-aware audio processing will make nearby voices feel present and voices farther away feel naturally quieter.</p>
              </div>
              <div className="attenuation-demo">
                <span />
                <span />
                <span />
                <span />
                <span />
                <b>distance →</b>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="closing-section">
          <Reveal>
            <span className="closing-kicker">THE OFFICE IS NO LONGER A ROOM.</span>
            <h2>
              It's a <span>space.</span>
            </h2>
            <p>
              Build a place where people can drop in, find each other, and talk
              without scheduling another meeting.
            </p>
            <MagneticCTA className="primary-cta primary-cta--large" href="/app">
              Enter ProxySpeak
              <span>→</span>
            </MagneticCTA>
          </Reveal>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="brand" href="#top">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>PROXYSPEAK</span>
        </a>
        <span>PROXIMITY-BASED VOICE COLLABORATION</span>
        <span>© 2026</span>
      </footer>
    </div>
  );
}
