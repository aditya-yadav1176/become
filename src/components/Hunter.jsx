import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OBSTACLES } from "../data/mapData";

// Waypoints for smooth natural patrol
const WAYPOINTS = [
  { pos: new THREE.Vector3(0, 0.5, 15) }, // Hall Center
  { pos: new THREE.Vector3(-15, 0.5, 15) }, // Hall corner
  { pos: new THREE.Vector3(-15, 0.5, 5) }, // Kitchen Doorway
  { pos: new THREE.Vector3(-15, 0.5, -5) }, // Kitchen Center
  { pos: new THREE.Vector3(-15, 0.5, 5) }, // Kitchen Doorway
  { pos: new THREE.Vector3(-15, 0.5, 15) }, // Hall corner
  { pos: new THREE.Vector3(0, 0.5, 15) }, // Hall Center
  { pos: new THREE.Vector3(15, 0.5, 15) }, // Hall corner
  { pos: new THREE.Vector3(15, 0.5, 5) }, // Bedroom Doorway
  { pos: new THREE.Vector3(15, 0.5, -5) }, // Bedroom Center
  { pos: new THREE.Vector3(15, 0.5, 5) }, // Bedroom Doorway
  { pos: new THREE.Vector3(15, 0.5, 15) }  // Hall corner
];

const checkWallCollision = (p, d, wall) => {
  const minX = wall.pos[0] - wall.size[0] / 2;
  const maxX = wall.pos[0] + wall.size[0] / 2;
  const minY = wall.pos[1] - wall.size[1] / 2;
  const maxY = wall.pos[1] + wall.size[1] / 2;
  const minZ = wall.pos[2] - wall.size[2] / 2;
  const maxZ = wall.pos[2] + wall.size[2] / 2;

  let tMin = -Infinity;
  let tMax = Infinity;

  // X axis
  if (Math.abs(d.x) < 1e-8) {
    if (p.x < minX || p.x > maxX) return null;
  } else {
    const t1 = (minX - p.x) / d.x;
    const t2 = (maxX - p.x) / d.x;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  // Y axis
  if (Math.abs(d.y) < 1e-8) {
    if (p.y < minY || p.y > maxY) return null;
  } else {
    const t1 = (minY - p.y) / d.y;
    const t2 = (maxY - p.y) / d.y;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  // Z axis
  if (Math.abs(d.z) < 1e-8) {
    if (p.z < minZ || p.z > maxZ) return null;
  } else {
    const t1 = (minZ - p.z) / d.z;
    const t2 = (maxZ - p.z) / d.z;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (tMin > tMax) return null;
  if (tMax < 0) return null;
  if (tMin > 1) return null;

  return Math.max(0, tMin);
};

export default function Hunter({ gameState, playerPosRef, hunterPosRef, resetTriggerRef }) {
  const hunterGroup = useRef();
  const bodyMesh = useRef();
  const torsoGroup = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const headMesh = useRef();

  const position = useRef(new THREE.Vector3(0, 0.5, 15));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const rotationY = useRef(Math.PI);
  
  const currentWaypoint = useRef(0);
  const pauseTimer = useRef(0);
  
  const detectionTimer = useRef(0);
  const isChasing = useRef(false);

  // Animation state
  const animTime = useRef(0);

  // Handle Round Reset
  useEffect(() => {
    if (resetTriggerRef && resetTriggerRef.current > 0) {
      position.current.copy(WAYPOINTS[0].pos);
      velocity.current.set(0, 0, 0);
      rotationY.current = Math.PI;
      currentWaypoint.current = 1;
      pauseTimer.current = 0;
      detectionTimer.current = 0;
      isChasing.current = false;
    }
  }, [resetTriggerRef?.current]);

  useFrame((state, dt) => {
    if (gameState === "HIDE" || gameState === "WIN" || gameState === "LOSE") {
      // Hunter is frozen/inactive during HIDE and endgame
      animTime.current = 0; // idle
      return;
    }

    const pos = position.current;
    let targetPos = null;
    let targetSpeed = 4;
    let isMoving = false;

    // 1. VISION SYSTEM
    let playerVisible = false;
    const distToPlayer = pos.distanceTo(playerPosRef.current);
    
    // Check range
    if (distToPlayer < 8.0) {
      const dirToPlayer = playerPosRef.current.clone().sub(pos).normalize();
      const hunterForward = new THREE.Vector3(Math.sin(rotationY.current), 0, Math.cos(rotationY.current));
      
      // Check FOV (70 degrees = 35 degrees each side)
      const angle = hunterForward.angleTo(dirToPlayer);
      if (angle < (35 * Math.PI / 180)) {
        // Raycast Line of Sight
        const rayVec = playerPosRef.current.clone().sub(pos);
        // Elevate ray slightly so it doesn't hit floor
        rayVec.y += 0.5;
        const pivot = pos.clone();
        pivot.y += 0.5;

        let hitWall = false;
        for (const obs of OBSTACLES) {
          const t = checkWallCollision(pivot, rayVec, obs);
          if (t !== null && t < 1.0) {
            hitWall = true;
            break;
          }
        }
        if (!hitWall) {
          playerVisible = true;
        }
      }
    }

    // Accumulate detection
    if (playerVisible) {
      detectionTimer.current += dt;
      if (detectionTimer.current > 1.0) {
        isChasing.current = true;
      }
    } else {
      detectionTimer.current = Math.max(0, detectionTimer.current - dt * 0.5);
      if (detectionTimer.current <= 0) {
        isChasing.current = false; // lose interest if totally lost
      }
    }

    // 2. MOVEMENT LOGIC
    if (isChasing.current) {
      targetPos = playerPosRef.current.clone();
      targetSpeed = 6;
      isMoving = true;
      
      // Check Catch condition
      if (distToPlayer < 1.2) {
        window.dispatchEvent(new CustomEvent('hunter-catch'));
      }
    } else {
      // Patrol Logic
      if (pauseTimer.current > 0) {
        pauseTimer.current -= dt;
      } else {
        targetPos = WAYPOINTS[currentWaypoint.current].pos.clone();
        const distToWaypoint = pos.distanceTo(targetPos);
        
        if (distToWaypoint < 0.5) {
          // Reached waypoint
          if (currentWaypoint.current === 3 || currentWaypoint.current === 9) { // Kitchen Center or Bedroom Center
            pauseTimer.current = 1.0; // Pause for 1 second in rooms
          } else {
            pauseTimer.current = 0.2; // Slight pause at doors
          }
          currentWaypoint.current = (currentWaypoint.current + 1) % WAYPOINTS.length;
        } else {
          isMoving = true;
        }
      }
    }

    // 3. APPLY MOVEMENT
    if (isMoving && targetPos) {
      const moveDir = targetPos.clone().sub(pos);
      moveDir.y = 0; // lock to horizontal plane
      
      if (moveDir.lengthSq() > 0.001) {
        moveDir.normalize();
        
        // Smoothly rotate towards target
        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        // Deal with angle wrap-around for lerp
        let diff = targetYaw - rotationY.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rotationY.current += diff * 10 * dt;

        // Move position
        pos.addScaledVector(moveDir, targetSpeed * dt);
        animTime.current += dt * (targetSpeed / 4);
      }
    } else {
      animTime.current += dt; // idle breathing time
    }

    // Export position for external reads
    if (hunterPosRef) {
      hunterPosRef.current.copy(pos);
    }
    if (hunterGroup.current) {
      hunterGroup.current.position.copy(pos);
      hunterGroup.current.rotation.y = rotationY.current;
    }

    // 4. ANIMATION
    const time = animTime.current;
    if (bodyMesh.current) {
      let bobOffset = 0;
      let targetTorsoX = 0, targetTorsoY = 0, targetHeadX = 0, targetHeadY = 0;
      let targetLeftLegX = 0, targetRightLegX = 0, targetLeftArmX = 0, targetRightArmX = 0;

      if (!isMoving) {
        bobOffset = Math.sin(time * 2.5) * 0.02;
        targetTorsoX = Math.sin(time * 2.5) * 0.01;
        targetHeadY = Math.sin(time * 0.8) * 0.12;
        targetLeftArmX = Math.sin(time * 2.5) * 0.03;
        targetRightArmX = -Math.sin(time * 2.5) * 0.03;
      } else {
        const freq = isChasing.current ? 11.0 : 7.0;
        const legAmp = isChasing.current ? 0.60 : 0.35;
        const armAmp = isChasing.current ? 0.55 : 0.30;
        
        targetLeftLegX = Math.sin(time * freq) * legAmp;
        targetRightLegX = -Math.sin(time * freq) * legAmp;
        targetLeftArmX = -Math.sin(time * freq) * armAmp;
        targetRightArmX = Math.sin(time * freq) * armAmp;

        bobOffset = Math.abs(Math.sin(time * freq)) * (isChasing.current ? 0.09 : 0.05) - (isChasing.current ? 0.045 : 0.025);
        targetTorsoX = (isChasing.current ? 0.12 : 0.04) + Math.sin(time * freq) * (isChasing.current ? 0.02 : 0.01);
        targetTorsoY = Math.sin(time * freq) * (isChasing.current ? 0.12 : 0.05);
        targetHeadX = isChasing.current ? -0.04 : 0;
        targetHeadY = -Math.sin(time * freq) * (isChasing.current ? 0.03 : 0.02);
      }

      const lerpSpeed = 10;
      bodyMesh.current.position.y = THREE.MathUtils.lerp(bodyMesh.current.position.y, bobOffset, lerpSpeed * dt);
      
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
  });

  return (
    <group ref={hunterGroup}>
      <group ref={bodyMesh}>
        {/* Torso Group (Hoodie & T-Shirt) */}
        <group ref={torsoGroup} position={[0, 0.7, 0]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.68, 0.36]} />
            <meshStandardMaterial color="#722F37" roughness={0.85} /> {/* Burgundy Hunter Hoodie */}
          </mesh>
          <mesh position={[0, 0.03, 0]} castShadow>
            <boxGeometry args={[0.61, 0.06, 0.37]} />
            <meshStandardMaterial color="#722F37" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.02, 0]} castShadow>
            <boxGeometry args={[0.57, 0.04, 0.34]} />
            <meshStandardMaterial color="#2d2a29" roughness={0.9} /> {/* Dark T-Shirt */}
          </mesh>
          <mesh position={[0, 0.69, 0]} castShadow>
            <boxGeometry args={[0.2, 0.03, 0.2]} />
            <meshStandardMaterial color="#2d2a29" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.52, -0.15]} castShadow>
            <boxGeometry args={[0.42, 0.42, 0.16]} />
            <meshStandardMaterial color="#722F37" roughness={0.85} />
          </mesh>

          {/* Head & Hair Group */}
          <group ref={headMesh} position={[0, 0.7, 0]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[0.12, 0.1, 0.12]} />
              <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[0.32, 0.32, 0.32]} />
              <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
            </mesh>
            {/* Glowing Red Eyes for Hunter */}
            <mesh position={[-0.07, 0.18, 0.161]} castShadow>
              <boxGeometry args={[0.06, 0.05, 0.01]} />
              <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2.0} roughness={0.1} />
            </mesh>
            <mesh position={[0.07, 0.18, 0.161]} castShadow>
              <boxGeometry args={[0.06, 0.05, 0.01]} />
              <meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2.0} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.32, 0.01]} castShadow>
              <boxGeometry args={[0.34, 0.12, 0.34]} />
              <meshStandardMaterial color="#111111" roughness={0.9} /> {/* Black Hair */}
            </mesh>
            <mesh position={[0, 0.22, -0.15]} castShadow>
              <boxGeometry args={[0.34, 0.18, 0.05]} />
              <meshStandardMaterial color="#111111" roughness={0.9} />
            </mesh>
          </group>

          {/* Left Arm */}
          <group ref={leftArm} position={[-0.38, 0.65, 0]}>
            <mesh position={[0, -0.225, 0]} castShadow>
              <boxGeometry args={[0.18, 0.45, 0.18]} />
              <meshStandardMaterial color="#722F37" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.5, 0]} castShadow>
              <boxGeometry args={[0.14, 0.12, 0.14]} />
              <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
            </mesh>
          </group>

          {/* Right Arm */}
          <group ref={rightArm} position={[0.38, 0.65, 0]}>
            <mesh position={[0, -0.225, 0]} castShadow>
              <boxGeometry args={[0.18, 0.45, 0.18]} />
              <meshStandardMaterial color="#722F37" roughness={0.85} />
            </mesh>
            <mesh position={[0, -0.5, 0]} castShadow>
              <boxGeometry args={[0.14, 0.12, 0.14]} />
              <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
            </mesh>
          </group>
        </group>

        {/* Legs Group */}
        <group position={[0, 0.7, 0]}>
          <group ref={leftLeg} position={[-0.15, 0, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.24, 0.6, 0.24]} />
              <meshStandardMaterial color="#2d2a29" roughness={0.95} /> {/* Dark Jeans */}
            </mesh>
            <mesh position={[0, -0.65, 0.04]} castShadow>
              <boxGeometry args={[0.22, 0.1, 0.32]} />
              <meshStandardMaterial color="#111111" roughness={0.5} /> {/* Shoes */}
            </mesh>
          </group>
          <group ref={rightLeg} position={[0.15, 0, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.24, 0.6, 0.24]} />
              <meshStandardMaterial color="#2d2a29" roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.65, 0.04]} castShadow>
              <boxGeometry args={[0.22, 0.1, 0.32]} />
              <meshStandardMaterial color="#111111" roughness={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
