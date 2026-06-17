import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { OBSTACLES } from "./Arena";
import { useKeyboard } from "../hooks/useKeyboard";

export default function Character({ isLocked }) {
  const { camera } = useThree();
  const keyboard = useKeyboard();

  // References for player state
  const position = useRef(new THREE.Vector3(0, 1.5, 0));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  
  // References for meshes to animate
  const playerGroup = useRef();
  const bodyMesh = useRef();
  const ringMesh = useRef();
  const leftWing = useRef();
  const rightWing = useRef();
  const thrusterGlow = useRef();

  // Camera control state
  const mouseRotation = useRef({ x: 0, y: 0.15 }); // yaw, pitch
  const currentLookAt = useRef(new THREE.Vector3(0, 1.5, 0));

  const playerRadius = 0.8;
  const playerHeight = 1.8;

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

  // AABB Collision Detection and Resolution
  const checkCollisions = (pos, vel) => {
    let grounded = false;

    // Check world bounds first
    const limit = 98;
    if (pos.x < -limit) { pos.x = -limit; vel.x = 0; }
    if (pos.x > limit) { pos.x = limit; vel.x = 0; }
    if (pos.z < -limit) { pos.z = -limit; vel.z = 0; }
    if (pos.z > limit) { pos.z = limit; vel.z = 0; }

    for (const obs of OBSTACLES) {
      // Player AABB
      const pMinX = pos.x - playerRadius;
      const pMaxX = pos.x + playerRadius;
      const pMinZ = pos.z - playerRadius;
      const pMaxZ = pos.z + playerRadius;
      const pMinY = pos.y;
      const pMaxY = pos.y + playerHeight;

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

    // Floor collision (y = 0 is ground, but player base is at y = 0, so height is from y to y+height)
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

    const { forward, backward, left, right, jump } = keyboard.current;

    // 1. Calculate direction vector based on camera's horizontal angle
    const camAngle = mouseRotation.current.x;
    const moveDir = new THREE.Vector3(0, 0, 0);

    if (forward) moveDir.z += 1;
    if (backward) moveDir.z -= 1;
    if (left) moveDir.x += 1;
    if (right) moveDir.x -= 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), camAngle);
    }

    // 2. Set target speed and interpolate current velocity
    const targetSpeed = 10; // units/sec
    const targetVelX = moveDir.x * targetSpeed;
    const targetVelZ = moveDir.z * targetSpeed;

    const acceleration = 10; // how fast we reach max speed
    velocity.current.x = THREE.MathUtils.lerp(
      velocity.current.x,
      targetVelX,
      acceleration * dt
    );
    velocity.current.z = THREE.MathUtils.lerp(
      velocity.current.z,
      targetVelZ,
      acceleration * dt
    );

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
      velocity.current.y = 11; // jump velocity
    }

    // 5. Animate & Position Character Mesh
    if (playerGroup.current) {
      // Position character (mesh center is slightly above pivot y)
      playerGroup.current.position.copy(position.current);

      // Smoothly rotate character toward movement direction
      if (moveDir.lengthSq() > 0.001) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetAngle - playerGroup.current.rotation.y;
        
        // Normalize angle to -PI to PI
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        playerGroup.current.rotation.y += diff * 12 * dt;
      }

      // Add a slight forward tilt when moving
      const lateralSpeed = Math.sqrt(
        velocity.current.x * velocity.current.x +
        velocity.current.z * velocity.current.z
      );
      const targetTilt = (lateralSpeed / targetSpeed) * 0.15;
      
      // Calculate tilt based on direction of movement vs current rotation
      if (bodyMesh.current) {
        bodyMesh.current.rotation.x = THREE.MathUtils.lerp(
          bodyMesh.current.rotation.x,
          targetTilt,
          10 * dt
        );
        
        // Bobbing effect (hovering)
        const time = state.clock.getElapsedTime();
        const bobOffset = Math.sin(time * 4) * 0.08;
        bodyMesh.current.position.y = 0.9 + bobOffset; // 0.9 is mid-height for 1.8 height

        // Spin the rings/particles
        if (ringMesh.current) {
          ringMesh.current.rotation.z = time * 2;
          ringMesh.current.rotation.y = time * 0.5;
        }

        // Animated thruster scale & intensity
        if (thrusterGlow.current) {
          const scale = 0.8 + Math.sin(time * 30) * 0.15 + (lateralSpeed / targetSpeed) * 0.3;
          thrusterGlow.current.scale.set(scale, scale, scale);
        }

        // Wings bobbing
        if (leftWing.current && rightWing.current) {
          leftWing.current.position.y = 0.9 + Math.sin(time * 3) * 0.05;
          rightWing.current.position.y = 0.9 + Math.sin(time * 3) * 0.05;
          leftWing.current.rotation.z = Math.sin(time * 3) * 0.05;
          rightWing.current.rotation.z = -Math.sin(time * 3) * 0.05;
        }
      }
    }

    // 6. Camera Follow System
    const theta = mouseRotation.current.x;
    const phi = mouseRotation.current.y;

    const camDistance = 7;
    // Calculate new target position behind the player
    const targetCamPos = new THREE.Vector3(
      position.current.x - Math.sin(theta) * Math.cos(phi) * camDistance,
      position.current.y + Math.sin(phi) * camDistance + 1.8, // Raised camera height slightly
      position.current.z - Math.cos(theta) * Math.cos(phi) * camDistance
    );

    // Smoothly interpolate camera position
    camera.position.lerp(targetCamPos, 10 * dt);

    // Target point for camera to look at
    const targetLookAt = new THREE.Vector3(
      position.current.x,
      position.current.y + 1.1, // Look at chest/head level
      position.current.z
    );

    // Smoothly interpolate the lookAt position to avoid camera jitters
    currentLookAt.current.lerp(targetLookAt, 12 * dt);
    camera.lookAt(currentLookAt.current);
  });

  return (
    <group ref={playerGroup}>
      {/* Visual representations of the player */}
      <group ref={bodyMesh}>
        {/* Core Body (Spherical/Capsule-ish) */}
        <mesh castShadow>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color="#0f172a"
            roughness={0.1}
            metalness={0.9}
            envMapIntensity={1}
          />
        </mesh>

        {/* Visor / Eye */}
        <mesh position={[0, 0.1, 0.4]}>
          <boxGeometry args={[0.6, 0.15, 0.1]} />
          <meshStandardMaterial
            color="#00f3ff"
            emissive="#00f3ff"
            emissiveIntensity={2}
          />
        </mesh>

        {/* Outer Orbiting Ring */}
        <mesh ref={ringMesh} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.03, 16, 100]} />
          <meshStandardMaterial
            color="#d946ef"
            emissive="#d946ef"
            emissiveIntensity={1.5}
          />
        </mesh>

        {/* Left Wing / Thruster Pod */}
        <mesh ref={leftWing} position={[-0.9, 0, -0.2]} castShadow>
          <boxGeometry args={[0.2, 0.5, 0.4]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Right Wing / Thruster Pod */}
        <mesh ref={rightWing} position={[0.9, 0, -0.2]} castShadow>
          <boxGeometry args={[0.2, 0.5, 0.4]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.7} />
        </mesh>

        {/* Thruster Flame/Light Glow */}
        <mesh ref={thrusterGlow} position={[0, -0.6, 0]}>
          <coneGeometry args={[0.15, 0.5, 16]} />
          <meshBasicMaterial color="#00f3ff" transparent opacity={0.8} />
        </mesh>
        
        {/* Point Light emitted from the thruster */}
        <pointLight position={[0, -0.8, 0]} intensity={1.5} distance={4} color="#00f3ff" />
      </group>

      {/* Particles trailing the player */}
      <Sparkles
        count={30}
        scale={[1.5, 1.5, 1.5]}
        size={2}
        speed={0.6}
        color="#00f3ff"
        opacity={0.6}
      />
    </group>
  );
}
