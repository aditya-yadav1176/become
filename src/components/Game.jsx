import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Arena from "./Arena";
import Character from "./Character";
import Instructions from "./Instructions";

export default function Game() {
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const handleLockChange = () => {
      setIsLocked(document.pointerLockElement === document.body);
    };

    document.addEventListener("pointerlockchange", handleLockChange);
    return () => {
      document.removeEventListener("pointerlockchange", handleLockChange);
    };
  }, []);

  const requestLock = () => {
    document.body.requestPointerLock();
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* UI overlay with instructions and enter button */}
      <Instructions isLocked={isLocked} onClick={requestLock} />

      <Canvas
        shadows
        camera={{ fov: 60, position: [0, 5, 10] }}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {/* Set background and fog for depth/atmosphere */}
        <color attach="background" args={["#0a0a0f"]} />
        <fog attach="fog" args={["#0a0a0f", 15, 70]} />

        {/* Game Elements */}
        <Arena />
        <Character isLocked={isLocked} />
      </Canvas>
    </div>
  );
}
