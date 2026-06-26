import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import Arena from "./Arena";
import Character from "./Character";
import Hunter from "./Hunter";
import Instructions from "./Instructions";

export default function Game() {
  const [isLocked, setIsLocked] = useState(false);
  const [hud, setHud] = useState({ visible: false, text: "" });

  // Game State
  const [gameState, setGameState] = useState("HIDE"); // HIDE, HUNT, WIN, LOSE
  const [timeLeft, setTimeLeft] = useState(20);
  const [playerFormName, setPlayerFormName] = useState("Human");

  // Shared refs for fast cross-component access
  const playerPosRef = useRef(new THREE.Vector3(0, 0, 15));
  const hunterPosRef = useRef(new THREE.Vector3(0, 0, 15));
  const resetTriggerRef = useRef(0);
  const playerMovedTimeRef = useRef(0);

  // Main Timer Loop
  useEffect(() => {
    if (gameState === "WIN" || gameState === "LOSE") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (gameState === "HIDE") {
            setGameState("HUNT");
            return 90;
          } else if (gameState === "HUNT") {
            setGameState("WIN");
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Handle manual restart and custom events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() === 'r' && (gameState === "WIN" || gameState === "LOSE")) {
        setGameState("HIDE");
        setTimeLeft(20);
        resetTriggerRef.current += 1;
      }
    };
    
    const handleCatch = () => {
      if (gameState === "HUNT") {
        setGameState("LOSE");
        setTimeLeft(0);
      }
    };

    const handleFormUpdate = (e) => {
      setPlayerFormName(e.detail.name);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("hunter-catch", handleCatch);
    window.addEventListener("player-form", handleFormUpdate);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("hunter-catch", handleCatch);
      window.removeEventListener("player-form", handleFormUpdate);
    };
  }, [gameState]);

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

      {/* Top Left Game Info HUD */}
      {isLocked && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 100,
            fontFamily: "'Outfit', 'Inter', sans-serif",
            color: "#f5ebe0",
            backgroundColor: "rgba(29, 53, 87, 0.8)",
            padding: "16px 24px",
            borderRadius: "12px",
            border: "2px solid rgba(245, 235, 224, 0.3)",
            backdropFilter: "blur(4px)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "1.2rem", fontWeight: "bold", textTransform: "uppercase", marginBottom: "8px", color: gameState === "HIDE" ? "#bae6fd" : "#fca5a5" }}>
            PHASE: {gameState}
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "800", marginBottom: "8px", fontFamily: "monospace" }}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <div style={{ fontSize: "1rem", opacity: 0.9 }}>
            FORM: <span style={{ fontWeight: "bold", color: "#fef08a" }}>{playerFormName}</span>
          </div>
        </div>
      )}

      {/* Center Announcements for Phase Changes */}
      {isLocked && (
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 100,
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: "3rem",
            fontWeight: "900",
            color: gameState === "WIN" ? "#86efac" : gameState === "LOSE" ? "#fca5a5" : "#f5ebe0",
            textShadow: "0 4px 16px rgba(0,0,0,0.8)",
            textTransform: "uppercase",
            pointerEvents: "none",
            textAlign: "center"
          }}
        >
          {gameState === "HIDE" && timeLeft > 17 && "HIDE NOW"}
          {gameState === "HUNT" && timeLeft > 87 && "HUNTER SEARCHING"}
          {gameState === "WIN" && (
            <>
              <div>YOU SURVIVED</div>
              <div style={{ fontSize: "1.5rem", marginTop: "16px", color: "#f5ebe0" }}>Press [R] to Restart</div>
            </>
          )}
          {gameState === "LOSE" && (
            <>
              <div>YOU WERE FOUND</div>
              <div style={{ fontSize: "1.5rem", marginTop: "16px", color: "#f5ebe0" }}>Press [R] to Restart</div>
            </>
          )}
        </div>
      )}

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
        <Character isLocked={isLocked} playerPosRef={playerPosRef} resetTriggerRef={resetTriggerRef} playerMovedTimeRef={playerMovedTimeRef} />
        <Hunter gameState={gameState} playerPosRef={playerPosRef} hunterPosRef={hunterPosRef} resetTriggerRef={resetTriggerRef} playerMovedTimeRef={playerMovedTimeRef} />
      </Canvas>
    </div>
  );
}
