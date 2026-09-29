import { useEffect, useRef, useState, useCallback } from "react";
import { MOVE_SPEED, SPAWN_POSITION } from "../constants/world";
import { getWorldViewport } from "../utils/worldViewport";

/**
 * Custom hook to handle continuous, frame-smooth keyboard movement.
 * Tracks active keys (WASD + Arrow keys) and updates player position with
 * strict world boundary enforcement and diagonal normalization.
 */
export function useMovement(initialPosition = SPAWN_POSITION, activePanel = null) {
  const [position, setPosition] = useState(initialPosition);
  const [heading, setHeading] = useState(0); // in radians
  const [activeKeys, setActiveKeys] = useState({});

  // Use refs to track state within the requestAnimationFrame loop
  const positionRef = useRef(initialPosition);
  const keysRef = useRef({});
  const animFrameRef = useRef(null);

  const resetPosition = useCallback(() => {
    positionRef.current = { ...SPAWN_POSITION };
    setPosition({ ...SPAWN_POSITION });
    setHeading(0);
  }, []);

  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore key events when user is typing in an input or textarea
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
        return;
      }

      // Prevent browser scroll on arrow keys or space while playing
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key) &&
        e.target === document.body
      ) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      if (!keysRef.current[key]) {
        keysRef.current[key] = true;
        // Keep a copy in React state for HUD / visual keycap highlighting
        setActiveKeys({ ...keysRef.current });
      }
    }

    function handleKeyUp(e) {
      const key = e.key.toLowerCase();
      if (keysRef.current[key]) {
        delete keysRef.current[key];
        setActiveKeys({ ...keysRef.current });
      }
    }

    function handleBlur() {
      // Clear all keys when tab loses focus to prevent stuck movement
      keysRef.current = {};
      setActiveKeys({});
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  useEffect(() => {
    const viewport = getWorldViewport({ panel: activePanel });
    const current = positionRef.current;
    const clamped = {
      x: Math.max(viewport.minX, Math.min(viewport.maxX, current.x)),
      y: Math.max(viewport.minY, Math.min(viewport.maxY, current.y))
    };

    if (clamped.x !== current.x || clamped.y !== current.y) {
      positionRef.current = clamped;
      setPosition(clamped);
    }
  }, [activePanel]);

  useEffect(() => {
    let lastTime = performance.now();

    function updatePhysics(currentTime) {
      const delta = Math.min((currentTime - lastTime) / 16.666, 2.0); // normalize against 60fps
      lastTime = currentTime;

      const keys = keysRef.current;
      let dx = 0;
      let dy = 0;

      if (keys["w"] || keys["arrowup"]) dy -= 1;
      if (keys["s"] || keys["arrowdown"]) dy += 1;
      if (keys["a"] || keys["arrowleft"]) dx -= 1;
      if (keys["d"] || keys["arrowright"]) dx += 1;

      if (dx !== 0 || dy !== 0) {
        // Normalize diagonal movement speed
        if (dx !== 0 && dy !== 0) {
          const invSqrt2 = 0.70710678;
          dx *= invSqrt2;
          dy *= invSqrt2;
        }

        const moveDistance = MOVE_SPEED * delta;
        const currentPos = positionRef.current;

        const viewport = getWorldViewport({ panel: activePanel });
        const minX = viewport.minX;
        const maxX = viewport.maxX;
        const minY = viewport.minY;
        const maxY = viewport.maxY;

        const nextX = Math.max(minX, Math.min(maxX, currentPos.x + dx * moveDistance));
        const nextY = Math.max(minY, Math.min(maxY, currentPos.y + dy * moveDistance));

        if (nextX !== currentPos.x || nextY !== currentPos.y) {
          positionRef.current = { x: nextX, y: nextY };
          setPosition({ x: nextX, y: nextY });
          setHeading(Math.atan2(dy, dx));
        }
      }

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    }

    animFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [activePanel]);

  return {
    position,
    heading,
    activeKeys,
    resetPosition
  };
}
