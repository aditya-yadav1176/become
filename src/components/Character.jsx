import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles, Html } from "@react-three/drei";
import * as THREE from "three";
import { OBSTACLES, WALLS, FURNITURE } from "../data/mapData";
import { useKeyboard } from "../hooks/useKeyboard";
import CameraManager from "./CameraManager";
import { FurnitureItem } from "./Arena";
import "./HUD.css";

export default function Character({ isLocked }) {
  const keyboard = useKeyboard();

  // References for player state
  const position = useRef(new THREE.Vector3(0, 0.5, 15));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const wasGrounded = useRef(true);
  const landCrouchTime = useRef(0);
  const takeoffCrouchTime = useRef(0);
  
  // References for meshes to animate
  const playerGroup = useRef();
  const bodyMesh = useRef(); // Character root bobbing
  const torsoGroup = useRef(); // Torso lean/twist pivot
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const headMesh = useRef();

  // Camera control state
  const mouseRotation = useRef({ x: 0, y: 0.15 }); // yaw, pitch
  const currentLookAt = useRef(new THREE.Vector3(0, 1.6, 15));

  // Dynamic collision dimensions
  const playerRadiusRef = useRef(0.8);
  const playerHeightRef = useRef(1.8);

  // Client-side camera variables
  const [cameraMode, setCameraMode] = useState("TP"); // "TP" or "FP"
  const [gameplayState, setGameplayState] = useState("human"); // "human", "object", "hunter"
  const [activeObject, setActiveObject] = useState(null); // active prop details
  const [hoveredProp, setHoveredProp] = useState(null); // interactive scanned prop
  const [transformTime, setTransformTime] = useState(0); // timestamp for visual feedback

  const zoomFactor = useRef(0.5); // 0 = closest, 1 = furthest
  const transitionT = useRef(1.0); // 0 = FP, 1 = TP

  // Set default activeObject if gameplayState === "object" and activeObject is null
  useEffect(() => {
    if (gameplayState === "object" && !activeObject) {
      setActiveObject({
        id: "default_crate",
        type: "wooden_crate",
        size: [0.8, 0.8, 0.8],
        color: "#8b5a2b"
      });
      setTransformTime(Date.now());
    }
  }, [gameplayState, activeObject]);

  // Handle zoom scroll wheel locally
  useEffect(() => {
    const handleWheel = (e) => {
      const zoomSpeed = 0.001;
      zoomFactor.current = Math.max(0.0, Math.min(1.0, zoomFactor.current + e.deltaY * zoomSpeed));
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Handle keyboard toggles
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLocked) return;

      if (e.code === "KeyV") {
        setCameraMode((prev) => (prev === "TP" ? "FP" : "TP"));
      }

      if (e.code === "Digit1") {
        setGameplayState("human");
      }
      if (e.code === "Digit2") {
        setGameplayState("object");
      }
      if (e.code === "Digit3") {
        setGameplayState("hunter");
      }

      if (e.code === "KeyE") {
        if (gameplayState === "object" && hoveredProp) {
          setActiveObject({
            id: hoveredProp.id,
            type: hoveredProp.type,
            size: hoveredProp.size,
            color: hoveredProp.color
          });
          setTransformTime(Date.now());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocked, gameplayState, hoveredProp]);

  // Handle mouse movement for camera orbit
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isLocked) return;

      const sensitivity = 0.002;
      mouseRotation.current.x -= e.movementX * sensitivity;
      mouseRotation.current.y -= e.movementY * sensitivity;

      // Clamp vertical pitch to prevent flipping (approx -60 to +60 degrees)
      mouseRotation.current.y = Math.max(
        -Math.PI / 4,
        Math.min(Math.PI / 3, mouseRotation.current.y)
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isLocked]);

  // AABB Collision Detection and Resolution (unmodified movement math, just uses dynamic dimensions)
  const checkCollisions = (pos, vel) => {
    let grounded = false;
    const currentRadius = playerRadiusRef.current;
    const currentHeight = playerHeightRef.current;

    // Check world bounds first
    const limit = 98;
    if (pos.x < -limit) { pos.x = -limit; vel.x = 0; }
    if (pos.x > limit) { pos.x = limit; vel.x = 0; }
    if (pos.z < -limit) { pos.z = -limit; vel.z = 0; }
    if (pos.z > limit) { pos.z = limit; vel.z = 0; }

    for (const obs of OBSTACLES) {
      // Exclude player's active object itself from collider list when transformed
      if (activeObject && obs.id === activeObject.id && gameplayState === "object") {
        continue;
      }

      // Player AABB
      const pMinX = pos.x - currentRadius;
      const pMaxX = pos.x + currentRadius;
      const pMinZ = pos.z - currentRadius;
      const pMaxZ = pos.z + currentRadius;
      const pMinY = pos.y;
      const pMaxY = pos.y + currentHeight;

      // Obstacle AABB
      const oMinX = obs.pos[0] - obs.size[0] / 2;
      const oMaxX = obs.pos[0] + obs.size[0] / 2;
      const oMinZ = obs.pos[2] - obs.size[2] / 2;
      const oMaxZ = obs.pos[2] + obs.size[2] / 2;
      const oMinY = obs.pos[1] - obs.size[1] / 2;
      const oMaxY = obs.pos[1] + obs.size[1] / 2;

      // Check for overlap on all 3 axes
      const overlapX = Math.min(pMaxX, oMaxX) - Math.max(pMinX, oMinX);
      const overlapZ = Math.min(pMaxZ, oMaxZ) - Math.max(pMinZ, oMinZ);
      const overlapY = Math.min(pMaxY, oMaxY) - Math.max(pMinY, oMinY);

      if (overlapX > 0 && overlapZ > 0 && overlapY > 0) {
        // Resolve along the axis of shallowest penetration
        if (overlapX < overlapZ && overlapX < overlapY) {
          const pushX = pos.x > obs.pos[0] ? overlapX : -overlapX;
          pos.x += pushX;
          vel.x = 0;
        } else if (overlapZ < overlapX && overlapZ < overlapY) {
          const pushZ = pos.z > obs.pos[2] ? overlapZ : -overlapZ;
          pos.z += pushZ;
          vel.z = 0;
        } else {
          // Resolve on Y axis
          if (pos.y > obs.pos[1]) {
            pos.y += overlapY;
            vel.y = 0;
            grounded = true; // We are standing on top of this block
          } else {
            pos.y -= overlapY;
            vel.y = 0;
          }
        }
      }
    }

    // Floor collision
    if (pos.y <= 0) {
      pos.y = 0;
      vel.y = Math.max(0, vel.y);
      grounded = true;
    }

    return grounded;
  };

  useFrame((state, delta) => {
    // Limit delta to prevent huge jumps when lagging
    const dt = Math.min(delta, 0.1);

    // Dynamic scale adjustments based on current form
    if (gameplayState === "object" && activeObject) {
      playerHeightRef.current = Math.max(0.4, Math.min(3.5, activeObject.size[1]));
      playerRadiusRef.current = Math.max(0.3, Math.min(1.8, Math.max(activeObject.size[0], activeObject.size[2]) / 2));
    } else {
      playerHeightRef.current = 1.8;
      playerRadiusRef.current = 0.8;
    }

    // Scanning for closest interactable prop in Object state
    if (gameplayState === "object") {
      let closest = null;
      let minD = 4.0;
      for (const item of FURNITURE) {
        // Don't scan the one we currently are
        if (activeObject && item.id === activeObject.id) continue;
        const itemPos = new THREE.Vector3(...item.pos);
        const dist = position.current.distanceTo(itemPos);
        if (dist < minD) {
          minD = dist;
          closest = item;
        }
      }
      if (hoveredProp?.id !== closest?.id) {
        setHoveredProp(closest);
      }
    } else {
      if (hoveredProp !== null) setHoveredProp(null);
    }

    const { forward, backward, left, right, jump } = keyboard.current;

    // 1. Calculate direction vector based on camera's horizontal angle
    const camAngle = mouseRotation.current.x;
    const moveDir = new THREE.Vector3(0, 0, 0);

    if (forward) moveDir.z -= 1;
    if (backward) moveDir.z += 1;
    if (left) moveDir.x -= 1;
    if (right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle);
    }

    // 2. Set target speed and interpolate current velocity
    const targetSpeed = keyboard.current.shift ? 10 : 4.5;
    const targetVelX = moveDir.x * targetSpeed;
    const targetVelZ = moveDir.z * targetSpeed;

    const acceleration = 10;
    velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelX, acceleration * dt);
    velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetVelZ, acceleration * dt);

    // Apply gravity
    const gravity = 28;
    velocity.current.y -= gravity * dt;

    // Apply movement
    position.current.x += velocity.current.x * dt;
    position.current.y += velocity.current.y * dt;
    position.current.z += velocity.current.z * dt;

    // 3. Collision Resolution
    const isGrounded = checkCollisions(position.current, velocity.current);

    // 4. Handle Jump
    if (isGrounded && jump) {
      velocity.current.y = 11;
    }

    // 5. Animate Humanoid Mesh (Only if Human or Hunter is active)
    if (playerGroup.current) {
      playerGroup.current.position.copy(position.current);

      // Smoothly rotate player toward movement direction
      if (moveDir.lengthSq() > 0.001) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetAngle - playerGroup.current.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        playerGroup.current.rotation.y += diff * 12 * dt;
      }

      const time = state.clock.getElapsedTime();
      const lateralSpeed = Math.sqrt(
        velocity.current.x * velocity.current.x +
        velocity.current.z * velocity.current.z
      );

      let animState = "idle";
      if (lateralSpeed > 0.15 && moveDir.lengthSq() > 0.001) {
        animState = keyboard.current.shift ? "run" : "walk";
      }

      if (isGrounded && !wasGrounded.current) {
        landCrouchTime.current = 0.15;
      }
      if (!isGrounded && wasGrounded.current && velocity.current.y > 0) {
        takeoffCrouchTime.current = 0.1;
      }
      wasGrounded.current = isGrounded;

      if (landCrouchTime.current > 0) landCrouchTime.current -= dt;
      if (takeoffCrouchTime.current > 0) takeoffCrouchTime.current -= dt;

      let crouchY = 0;
      let crouchKneeBend = 0;
      let crouchArmLift = 0;

      if (landCrouchTime.current > 0) {
        const progress = landCrouchTime.current / 0.15;
        const intensity = Math.sin(progress * Math.PI);
        crouchY = -0.15 * intensity;
        crouchKneeBend = 0.25 * intensity;
        crouchArmLift = -0.15 * intensity;
      } else if (takeoffCrouchTime.current > 0) {
        const progress = takeoffCrouchTime.current / 0.1;
        const intensity = Math.sin(progress * Math.PI);
        crouchY = -0.08 * intensity;
        crouchKneeBend = 0.15 * intensity;
        crouchArmLift = -0.1 * intensity;
      }

      if ((gameplayState === "human" || gameplayState === "hunter") && bodyMesh.current) {
        let bobOffset = 0;
        let targetTorsoX = 0;
        let targetTorsoY = 0;
        let targetHeadX = 0;
        let targetHeadY = 0;
        
        let targetLeftLegX = 0;
        let targetRightLegX = 0;
        let targetLeftArmX = 0;
        let targetRightArmX = 0;

        if (animState === "idle") {
          bobOffset = Math.sin(time * 2.5) * 0.02;
          targetTorsoX = Math.sin(time * 2.5) * 0.01;
          targetHeadY = Math.sin(time * 0.8) * 0.12;
          targetLeftArmX = Math.sin(time * 2.5) * 0.03;
          targetRightArmX = -Math.sin(time * 2.5) * 0.03;
        } else if (animState === "walk") {
          const freq = 7.0;
          const legAmp = 0.35;
          const armAmp = 0.30;
          
          targetLeftLegX = Math.sin(time * freq) * legAmp;
          targetRightLegX = -Math.sin(time * freq) * legAmp;
          targetLeftArmX = -Math.sin(time * freq) * armAmp;
          targetRightArmX = Math.sin(time * freq) * armAmp;
          bobOffset = Math.abs(Math.sin(time * freq)) * 0.05 - 0.025;
          targetTorsoX = 0.04 + Math.sin(time * freq) * 0.01;
          targetTorsoY = Math.sin(time * freq) * 0.05;
          targetHeadY = -Math.sin(time * freq) * 0.02;
        } else if (animState === "run") {
          const freq = 11.0;
          const legAmp = 0.60;
          const armAmp = 0.55;

          targetLeftLegX = Math.sin(time * freq) * legAmp;
          targetRightLegX = -Math.sin(time * freq) * legAmp;
          targetLeftArmX = -Math.sin(time * freq) * armAmp;
          targetRightArmX = Math.sin(time * freq) * armAmp;
          bobOffset = Math.abs(Math.sin(time * freq)) * 0.09 - 0.045;
          targetTorsoX = 0.12 + Math.sin(time * freq) * 0.02;
          targetTorsoY = Math.sin(time * freq) * 0.12;
          targetHeadX = -0.04;
          targetHeadY = -Math.sin(time * freq) * 0.03;
        }

        if (!isGrounded) {
          targetLeftLegX = -0.15;
          targetRightLegX = -0.15;
          targetLeftArmX = 0.05;
          targetRightArmX = 0.05;
          targetTorsoX = 0;
          targetTorsoY = 0;
          targetHeadX = 0;
          targetHeadY = 0;
          bobOffset = 0;
        }

        bobOffset += crouchY;
        targetLeftLegX += crouchKneeBend;
        targetRightLegX += crouchKneeBend;
        targetLeftArmX += crouchArmLift;
        targetRightArmX += crouchArmLift;

        const lerpSpeed = 10;
        
        bodyMesh.current.position.y = THREE.MathUtils.lerp(bodyMesh.current.position.y, bobOffset, lerpSpeed * dt);
        bodyMesh.current.rotation.x = 0;
        bodyMesh.current.rotation.y = 0;
        bodyMesh.current.rotation.z = 0;

        if (torsoGroup.current) {
          torsoGroup.current.rotation.x = THREE.MathUtils.lerp(torsoGroup.current.rotation.x, targetTorsoX, lerpSpeed * dt);
          torsoGroup.current.rotation.y = THREE.MathUtils.lerp(torsoGroup.current.rotation.y, targetTorsoY, lerpSpeed * dt);
        }

        if (headMesh.current) {
          headMesh.current.rotation.x = THREE.MathUtils.lerp(headMesh.current.rotation.x, targetHeadX, lerpSpeed * dt);
          headMesh.current.rotation.y = THREE.MathUtils.lerp(headMesh.current.rotation.y, targetHeadY, lerpSpeed * dt);
        }

        if (leftLeg.current) {
          leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, targetLeftLegX, lerpSpeed * dt);
        }
        if (rightLeg.current) {
          rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, targetRightLegX, lerpSpeed * dt);
        }
        if (leftArm.current) {
          leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, targetLeftArmX, lerpSpeed * dt);
        }
        if (rightArm.current) {
          rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, targetRightArmX, lerpSpeed * dt);
        }
      }
    }
  });

  const isTP = cameraMode === "TP" || transitionT.current > 0.1;

  return (
    <>
      {/* 3D Camera Follow Logic */}
      <CameraManager
        cameraMode={cameraMode}
        gameplayState={gameplayState}
        activeObject={activeObject}
        position={position}
        mouseRotation={mouseRotation}
        currentLookAt={currentLookAt}
        zoomFactor={zoomFactor}
        transitionT={transitionT}
      />

      {/* Immersive FPS Gun overlay */}
      {gameplayState === "hunter" && cameraMode === "FP" && transitionT.current < 0.1 && (
        <FPWeapon />
      )}

      {/* HTML HUD Panel */}
      <Html fullscreen style={{ pointerEvents: "none" }}>
        <div className="hud-container">
          {/* Title Badge */}
          <div className="hud-title-badge glass-panel">
            <div className="hud-title-dot" />
            <div className="hud-title-text">Become</div>
          </div>

          {/* Camera Mode Pill */}
          <div className={`camera-pill glass-panel ${cameraMode.toLowerCase()}`}>
            <div className="camera-status-dot" />
            <div>
              {cameraMode === "FP" ? "First Person" : "Third Person"}
              <span className="camera-pill-key">V</span>
            </div>
          </div>

          {/* FPS Crosshair */}
          {cameraMode === "FP" && <div className="fps-crosshair" />}

          {/* Object Proximity prompt */}
          {gameplayState === "object" && hoveredProp && (
            <div className="interact-prompt glass-panel">
              <span className="interact-key">E</span>
              <span className="interact-text">Become {hoveredProp.type.replace(/_/g, " ")}</span>
            </div>
          )}

          {/* Zoom Indicator */}
          {cameraMode === "TP" && (
            <div className="zoom-indicator-panel glass-panel">
              <span className="zoom-icon">+</span>
              <div className="zoom-bar-container">
                <div
                  className="zoom-bar-fill"
                  style={{ height: `${zoomFactor.current * 100}%` }}
                />
              </div>
              <span className="zoom-icon">-</span>
            </div>
          )}

          {/* Bottom state selector */}
          <div className="state-selector glass-panel">
            <button
              className={`state-btn ${gameplayState === "human" ? "active human" : ""}`}
              onClick={() => setGameplayState("human")}
            >
              <span>Human</span>
              <span className="state-btn-key">[1]</span>
            </button>
            <button
              className={`state-btn ${gameplayState === "object" ? "active object" : ""}`}
              onClick={() => setGameplayState("object")}
            >
              <span>Object</span>
              <span className="state-btn-key">[2]</span>
            </button>
            <button
              className={`state-btn ${gameplayState === "hunter" ? "active hunter" : ""}`}
              onClick={() => setGameplayState("hunter")}
            >
              <span>Hunter</span>
              <span className="state-btn-key">[3]</span>
            </button>
          </div>
        </div>
      </Html>

      {/* Main player character ref group */}
      <group ref={playerGroup}>
        {/* Transform Sparkle effect */}
        {Date.now() - transformTime < 600 && (
          <Sparkles
            count={60}
            scale={2.0}
            size={7}
            speed={3.5}
            noise={1.2}
            color={gameplayState === "hunter" ? "#ef233c" : "#ffb703"}
            position={[0, playerHeightRef.current / 2, 0]}
          />
        )}

        {/* 1. Human Visual Model */}
        {gameplayState === "human" && (
          <group ref={bodyMesh} visible={isTP}>
            {/* Torso Group (Hoodie & T-Shirt) - Pivot at hips Y = 0.7 */}
            <group ref={torsoGroup} position={[0, 0.7, 0]}>
              {/* Torso Hoodie Main Block */}
              <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 0.68, 0.36]} />
                <meshStandardMaterial color="#1d3557" roughness={0.85} />
              </mesh>
              
              {/* Hoodie Bottom Hem Trim */}
              <mesh position={[0, 0.03, 0]} castShadow>
                <boxGeometry args={[0.61, 0.06, 0.37]} />
                <meshStandardMaterial color="#1d3557" roughness={0.85} />
              </mesh>

              {/* Cream T-Shirt peeking out at bottom */}
              <mesh position={[0, -0.02, 0]} castShadow>
                <boxGeometry args={[0.57, 0.04, 0.34]} />
                <meshStandardMaterial color="#f5ebe0" roughness={0.9} />
              </mesh>

              {/* Cream T-Shirt Collar peeking out at neck */}
              <mesh position={[0, 0.69, 0]} castShadow>
                <boxGeometry args={[0.2, 0.03, 0.2]} />
                <meshStandardMaterial color="#f5ebe0" roughness={0.9} />
              </mesh>

              {/* Hoodie Hood folded back */}
              <mesh position={[0, 0.52, -0.15]} castShadow>
                <boxGeometry args={[0.42, 0.42, 0.16]} />
                <meshStandardMaterial color="#1d3557" roughness={0.85} />
              </mesh>

              {/* Head & Hair Group - Y = 0.7 relative to hip pivot (1.4 absolute) */}
              <group ref={headMesh} position={[0, 0.7, 0]}>
                {/* Neck */}
                <mesh position={[0, 0.05, 0]} castShadow>
                  <boxGeometry args={[0.12, 0.1, 0.12]} />
                  <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
                </mesh>
                
                {/* Face/Head (Skin tone, no features) */}
                <mesh position={[0, 0.2, 0]} castShadow>
                  <boxGeometry args={[0.32, 0.32, 0.32]} />
                  <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
                </mesh>

                {/* Minimal Face: Left Eye */}
                <mesh position={[-0.07, 0.18, 0.161]} castShadow>
                  <boxGeometry args={[0.05, 0.04, 0.01]} />
                  <meshStandardMaterial color="#2d1a10" roughness={0.9} />
                </mesh>

                {/* Minimal Face: Right Eye */}
                <mesh position={[0.07, 0.18, 0.161]} castShadow>
                  <boxGeometry args={[0.05, 0.04, 0.01]} />
                  <meshStandardMaterial color="#2d1a10" roughness={0.9} />
                </mesh>

                {/* Hair */}
                <mesh position={[0, 0.32, 0.01]} castShadow>
                  <boxGeometry args={[0.34, 0.12, 0.34]} />
                  <meshStandardMaterial color="#4a3728" roughness={0.9} />
                </mesh>
                {/* Hair back trim */}
                <mesh position={[0, 0.22, -0.15]} castShadow>
                  <boxGeometry args={[0.34, 0.18, 0.05]} />
                  <meshStandardMaterial color="#4a3728" roughness={0.9} />
                </mesh>
              </group>

              {/* Left Arm Group - Y = 0.65 relative to hip pivot (1.35 absolute) */}
              <group ref={leftArm} position={[-0.38, 0.65, 0]}>
                {/* Hoodie Sleeve */}
                <mesh position={[0, -0.225, 0]} castShadow>
                  <boxGeometry args={[0.18, 0.45, 0.18]} />
                  <meshStandardMaterial color="#1d3557" roughness={0.85} />
                </mesh>
                {/* Hand */}
                <mesh position={[0, -0.5, 0]} castShadow>
                  <boxGeometry args={[0.14, 0.12, 0.14]} />
                  <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
                </mesh>
              </group>

              {/* Right Arm Group - Y = 0.65 relative to hip pivot (1.35 absolute) */}
              <group ref={rightArm} position={[0.38, 0.65, 0]}>
                {/* Hoodie Sleeve */}
                <mesh position={[0, -0.225, 0]} castShadow>
                  <boxGeometry args={[0.18, 0.45, 0.18]} />
                  <meshStandardMaterial color="#1d3557" roughness={0.85} />
                </mesh>
                {/* Hand */}
                <mesh position={[0, -0.5, 0]} castShadow>
                  <boxGeometry args={[0.14, 0.12, 0.14]} />
                  <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
                </mesh>
              </group>
            </group>

            {/* Left Leg Group - attached directly to bodyMesh at hips (Y = 0.7 absolute) */}
            <group ref={leftLeg} position={[-0.18, 0.7, 0]}>
              {/* Pants */}
              <mesh position={[0, -0.275, 0]} castShadow>
                <boxGeometry args={[0.24, 0.55, 0.24]} />
                <meshStandardMaterial color="#8c7866" roughness={0.9} />
              </mesh>
              {/* Sneaker */}
              <mesh position={[0, -0.625, 0.03]} castShadow>
                <boxGeometry args={[0.24, 0.15, 0.32]} />
                <meshStandardMaterial color="#fafafa" roughness={0.8} />
              </mesh>
              {/* Sneaker Sole */}
              <mesh position={[0, -0.71, 0.03]} castShadow>
                <boxGeometry args={[0.25, 0.04, 0.33]} />
                <meshStandardMaterial color="#a1a1aa" roughness={0.8} />
              </mesh>
            </group>

            {/* Right Leg Group - attached directly to bodyMesh at hips (Y = 0.7 absolute) */}
            <group ref={rightLeg} position={[0.18, 0.7, 0]}>
              {/* Pants */}
              <mesh position={[0, -0.275, 0]} castShadow>
                <boxGeometry args={[0.24, 0.55, 0.24]} />
                <meshStandardMaterial color="#8c7866" roughness={0.9} />
              </mesh>
              {/* Sneaker */}
              <mesh position={[0, -0.625, 0.03]} castShadow>
                <boxGeometry args={[0.24, 0.15, 0.32]} />
                <meshStandardMaterial color="#fafafa" roughness={0.8} />
              </mesh>
              {/* Sneaker Sole */}
              <mesh position={[0, -0.71, 0.03]} castShadow>
                <boxGeometry args={[0.25, 0.04, 0.33]} />
                <meshStandardMaterial color="#a1a1aa" roughness={0.8} />
              </mesh>
            </group>
          </group>
        )}

        {/* 2. Hunter Visual Model (Tactical Cyber Soldier) */}
        {gameplayState === "hunter" && (
          <group ref={bodyMesh} visible={isTP}>
            {/* Torso Group (Sci-fi Combat Armor) - Pivot at hips Y = 0.7 */}
            <group ref={torsoGroup} position={[0, 0.7, 0]}>
              {/* Torso Armor Main Block */}
              <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 0.68, 0.36]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.5} />
              </mesh>
              
              {/* Glowing chest power core */}
              <mesh position={[0, 0.45, 0.181]} castShadow>
                <boxGeometry args={[0.15, 0.15, 0.01]} />
                <meshStandardMaterial color="#ef233c" emissive="#ef233c" roughness={0.1} />
              </mesh>

              {/* Red shoulder pads */}
              <mesh position={[-0.32, 0.65, 0]} castShadow>
                <boxGeometry args={[0.16, 0.12, 0.22]} />
                <meshStandardMaterial color="#ef233c" roughness={0.6} />
              </mesh>
              <mesh position={[0.32, 0.65, 0]} castShadow>
                <boxGeometry args={[0.16, 0.12, 0.22]} />
                <meshStandardMaterial color="#ef233c" roughness={0.6} />
              </mesh>

              {/* Head & Cyber Helmet Group - Y = 0.7 relative to hip pivot (1.4 absolute) */}
              <group ref={headMesh} position={[0, 0.7, 0]}>
                {/* Cyber Helmet */}
                <mesh position={[0, 0.22, 0.02]} castShadow>
                  <boxGeometry args={[0.34, 0.34, 0.34]} />
                  <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.6} />
                </mesh>
                {/* Glowing Red Visor */}
                <mesh position={[0, 0.24, 0.181]} castShadow>
                  <boxGeometry args={[0.26, 0.08, 0.02]} />
                  <meshStandardMaterial color="#ef233c" emissive="#ef233c" roughness={0.1} />
                </mesh>
                {/* Cyber antenna */}
                <mesh position={[-0.18, 0.28, -0.05]} castShadow>
                  <boxGeometry args={[0.02, 0.14, 0.02]} />
                  <meshStandardMaterial color="#ef233c" roughness={0.5} />
                </mesh>
              </group>

              {/* Left Arm Group - Y = 0.65 relative to hip pivot (1.35 absolute) */}
              <group ref={leftArm} position={[-0.38, 0.65, 0]}>
                <mesh position={[0, -0.225, 0]} castShadow>
                  <boxGeometry args={[0.18, 0.45, 0.18]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.3} />
                </mesh>
                {/* Red Cuff */}
                <mesh position={[0, -0.42, 0]} castShadow>
                  <boxGeometry args={[0.19, 0.06, 0.19]} />
                  <meshStandardMaterial color="#ef233c" roughness={0.5} />
                </mesh>
                {/* Hand */}
                <mesh position={[0, -0.5, 0]} castShadow>
                  <boxGeometry args={[0.14, 0.12, 0.14]} />
                  <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
                </mesh>
              </group>

              {/* Right Arm Group - Y = 0.65 relative to hip pivot (1.35 absolute) */}
              <group ref={rightArm} position={[0.38, 0.65, 0]}>
                <mesh position={[0, -0.225, 0]} castShadow>
                  <boxGeometry args={[0.18, 0.45, 0.18]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.7} metalness={0.3} />
                </mesh>
                {/* Red Cuff */}
                <mesh position={[0, -0.42, 0]} castShadow>
                  <boxGeometry args={[0.19, 0.06, 0.19]} />
                  <meshStandardMaterial color="#ef233c" roughness={0.5} />
                </mesh>
                {/* Hand */}
                <mesh position={[0, -0.5, 0]} castShadow>
                  <boxGeometry args={[0.14, 0.12, 0.14]} />
                  <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
                </mesh>
                
                {/* TP Laser Rifle attached to arm */}
                <group position={[0, -0.42, 0.18]} rotation={[-0.05, 0, 0]}>
                  {/* Main Gun Body */}
                  <mesh castShadow receiveShadow>
                    <boxGeometry args={[0.08, 0.12, 0.5]} />
                    <meshStandardMaterial color="#1f1f23" roughness={0.5} metalness={0.8} />
                  </mesh>
                  {/* Gun Barrel */}
                  <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.02, 0.02, 0.3]} />
                    <meshStandardMaterial color="#71717a" roughness={0.4} metalness={0.7} />
                  </mesh>
                  {/* Scope */}
                  <mesh position={[0, 0.07, -0.05]} castShadow>
                    <boxGeometry args={[0.03, 0.04, 0.15]} />
                    <meshStandardMaterial color="#111" roughness={0.8} />
                  </mesh>
                  {/* Glowing Laser Sight (Crimson) */}
                  <mesh position={[0, 0.015, -0.2]} castShadow>
                    <boxGeometry args={[0.008, 0.008, 0.25]} />
                    <meshStandardMaterial color="#ef233c" emissive="#ef233c" roughness={0.1} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* Left Leg Group */}
            <group ref={leftLeg} position={[-0.18, 0.7, 0]}>
              <mesh position={[0, -0.275, 0]} castShadow>
                <boxGeometry args={[0.24, 0.55, 0.24]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.625, 0.03]} castShadow>
                <boxGeometry args={[0.24, 0.15, 0.32]} />
                <meshStandardMaterial color="#ef233c" roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.71, 0.03]} castShadow>
                <boxGeometry args={[0.25, 0.04, 0.33]} />
                <meshStandardMaterial color="#111" roughness={0.8} />
              </mesh>
            </group>

            {/* Right Leg Group */}
            <group ref={rightLeg} position={[0.18, 0.7, 0]}>
              <mesh position={[0, -0.275, 0]} castShadow>
                <boxGeometry args={[0.24, 0.55, 0.24]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
              </mesh>
              <mesh position={[0, -0.625, 0.03]} castShadow>
                <boxGeometry args={[0.24, 0.15, 0.32]} />
                <meshStandardMaterial color="#ef233c" roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.71, 0.03]} castShadow>
                <boxGeometry args={[0.25, 0.04, 0.33]} />
                <meshStandardMaterial color="#111" roughness={0.8} />
              </mesh>
            </group>
          </group>
        )}

        {/* 3. Transformed Object Visual Model */}
        {gameplayState === "object" && activeObject && (
          <group visible={isTP} position={[0, activeObject.size[1] / 2, 0]}>
            <FurnitureItem
              type={activeObject.type}
              pos={[0, 0, 0]}
              size={activeObject.size}
              color={activeObject.color}
            />
          </group>
        )}
      </group>
    </>
  );
}

// First Person immersive laser rifle overlay component
function FPWeapon() {
  const { camera } = useThree();
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Copy camera position and orientation client-side
    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);

    const time = state.clock.getElapsedTime();
    
    // Smooth breathing bobbing
    const breathY = Math.sin(time * 2.2) * 0.0035;
    const breathX = Math.cos(time * 1.1) * 0.002;
    
    // Apply offset bobs directly to the first-person gun mesh group
    const gunMesh = groupRef.current.children[0];
    if (gunMesh) {
      gunMesh.position.y = -0.22 + breathY;
      gunMesh.position.x = 0.22 + breathX;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Position gun mesh relative to camera: right (0.22), down (-0.22), forward (-0.45) */}
      <group position={[0.22, -0.22, -0.45]} rotation={[-0.05, -0.1, 0.02]}>
        {/* Gun Body */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.07, 0.1, 0.45]} />
          <meshStandardMaterial color="#1f1f23" roughness={0.55} metalness={0.8} />
        </mesh>
        
        {/* Gun Barrel */}
        <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.3]} />
          <meshStandardMaterial color="#71717a" roughness={0.4} metalness={0.7} />
        </mesh>
        
        {/* Scope */}
        <mesh position={[0, 0.07, -0.05]} castShadow>
          <boxGeometry args={[0.03, 0.04, 0.15]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>
        
        {/* Laser Sight Line (Glowing Crimson) */}
        <mesh position={[0, 0.015, -0.2]} castShadow>
          <boxGeometry args={[0.008, 0.008, 0.25]} />
          <meshStandardMaterial color="#ff002b" emissive="#ff002b" roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
}
