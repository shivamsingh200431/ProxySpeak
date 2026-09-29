import { useEffect, useRef, useState, useCallback } from "react";
import { MOVE_SPEED, SPAWN_POSITION } from "../constants/world";
import { canOccupy, WORLD_BOUNDS } from "../utils/worldCollision";

const PLAYER_RADIUS = 12;

export function useMovement(initialPosition = SPAWN_POSITION) {
  const [position, setPosition] = useState(initialPosition);
  const [heading, setHeading] = useState(0);
  const [activeKeys, setActiveKeys] = useState({});

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
      if (e.target && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key) &&
          e.target === document.body) {
        e.preventDefault();
      }

      const key = e.key.toLowerCase();
      if (!keysRef.current[key]) {
        keysRef.current[key] = true;
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
    let lastTime = performance.now();

    function updatePhysics(currentTime) {
      const delta = Math.min((currentTime - lastTime) / 16.666, 2);
      lastTime = currentTime;

      let dx = 0;
      let dy = 0;
      const keys = keysRef.current;

      if (keys.w || keys.arrowup) dy -= 1;
      if (keys.s || keys.arrowdown) dy += 1;
      if (keys.a || keys.arrowleft) dx -= 1;
      if (keys.d || keys.arrowright) dx += 1;

      if (dx || dy) {
        if (dx && dy) {
          dx *= 0.70710678;
          dy *= 0.70710678;
        }

        const distance = MOVE_SPEED * delta;
        const current = positionRef.current;
        const targetX = Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, current.x + dx * distance));
        const targetY = Math.max(WORLD_BOUNDS.minY, Math.min(WORLD_BOUNDS.maxY, current.y + dy * distance));

        // Resolve axes independently so the player can slide along walls.
        let nextX = current.x;
        let nextY = current.y;

        if (canOccupy(targetX, current.y, PLAYER_RADIUS)) nextX = targetX;
        if (canOccupy(nextX, targetY, PLAYER_RADIUS)) nextY = targetY;

        if (nextX !== current.x || nextY !== current.y) {
          const next = { x: nextX, y: nextY };
          positionRef.current = next;
          setPosition(next);
          setHeading(Math.atan2(dy, dx));
        }
      }

      animFrameRef.current = requestAnimationFrame(updatePhysics);
    }

    animFrameRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  });

  return { position, heading, activeKeys, resetPosition };
}
