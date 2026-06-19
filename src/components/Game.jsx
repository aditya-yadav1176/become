import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Arena from "./Arena";
import Character from "./Character";
import Instructions from "./Instructions";

export default function Game() {
  const [isLocked, setIsLocked] = useState(false);
  const [hud, setHud] = useState({ visible: false, text: "" });

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement === document.body);
    };

    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, []);

  useEffect(() => {
    const handleHudUpdate = (e) => {
      setHud(e.detail);
    };
    window.addEventListener("hud-update", handleHudUpdate);
    return () => {
      window.removeEventListener("hud-update", handleHudUpdate);
    };
  }, []);

  const requestLock = () => {
    document.body.requestPointerLock();
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* UI overlay with instructions and enter button */}
      <Instructions isLocked={isLocked} onClick={requestLock} />

      {/* Cozy HUD Prompt Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          fontFamily: "'Outfit', 'Inter', sans-serif",
          fontSize: "1.25rem",
          fontWeight: "600",
          color: "#f5ebe0",
          backgroundColor: "rgba(29, 53, 87, 0.95)",
          padding: "12px 24px",
          borderRadius: "12px",
          border: "1px solid rgba(245, 235, 224, 0.25)",
          backdropFilter: "blur(6px)",
          whiteSpace: "nowrap",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          textTransform: "uppercase",
          letterSpacing: "1.2px",
          pointerEvents: "none",
          userSelect: "none",
          opacity: hud.visible ? 1 : 0,
          transition: "opacity 0.25s ease-in-out",
        }}
      >
        {hud.text}
      </div>

      <Canvas
        shadows
        camera={{ fov: 60, position: [0, 5, 10] }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {/* Set background and fog for depth/atmosphere */}
        <color attach="background" args={["#eae6df"]} />
        <fog attach="fog" args={["#eae6df", 30, 100]} />

        {/* Game Elements */}
        <Arena />
        <Character isLocked={isLocked} />
      </Canvas>
    </div>
  );
}
