import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OBSTACLES, FURNITURE } from "../data/mapData";
import { Html } from "@react-three/drei";

// Rooms and Waypoints
const ROOMS = {
  Hall: { min: { x: -23, z: 6 }, max: { x: 23, z: 23 } },
  Kitchen: { min: { x: -23, z: -13 }, max: { x: -7, z: 4 } },
  Bedroom: { min: { x: 7, z: -13 }, max: { x: 23, z: 4 } },
};
const DOORS = {
  Kitchen: new THREE.Vector3(-15, 0.5, 5),
  Bedroom: new THREE.Vector3(15, 0.5, 5),
};

const checkWallCollision = (p, d, wall) => {
  const minX = wall.pos[0] - wall.size[0] / 2;
  const maxX = wall.pos[0] + wall.size[0] / 2;
  const minY = wall.pos[1] - wall.size[1] / 2;
  const maxY = wall.pos[1] + wall.size[1] / 2;
  const minZ = wall.pos[2] - wall.size[2] / 2;
  const maxZ = wall.pos[2] + wall.size[2] / 2;

  let tMin = -Infinity;
  let tMax = Infinity;

  if (Math.abs(d.x) < 1e-8) {
    if (p.x < minX || p.x > maxX) return null;
  } else {
    const t1 = (minX - p.x) / d.x;
    const t2 = (maxX - p.x) / d.x;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

  if (Math.abs(d.y) < 1e-8) {
    if (p.y < minY || p.y > maxY) return null;
  } else {
    const t1 = (minY - p.y) / d.y;
    const t2 = (maxY - p.y) / d.y;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  }

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

function getRoomForPos(pos) {
  if (pos.z > 5) return "Hall";
  if (pos.x < 0) return "Kitchen";
  return "Bedroom";
}

function getRandomPointInRoom(roomName) {
  const r = ROOMS[roomName];
  const x = Math.random() * (r.max.x - r.min.x) + r.min.x;
  const z = Math.random() * (r.max.z - r.min.z) + r.min.z;
  return new THREE.Vector3(x, 0.5, z);
}

function checkObstacleOverlap(pos, radius = 1.0) {
  for (const obs of OBSTACLES) {
    const hw = obs.size[0] / 2 + radius;
    const hh = obs.size[1] / 2;
    const hd = obs.size[2] / 2 + radius;
    if (Math.abs(pos.x - obs.pos[0]) < hw && 
        pos.y > obs.pos[1] - hh && pos.y < obs.pos[1] + hh && 
        Math.abs(pos.z - obs.pos[2]) < hd) {
      return true;
    }
  }
  return false;
}

export default function Hunter({ gameState, playerPosRef, hunterPosRef, resetTriggerRef, playerMovedTimeRef, playerFormChangedTimeRef, playerFormName }) {
  const hunterGroup = useRef();
  const bodyMesh = useRef();
  const torsoGroup = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const headMesh = useRef();

  const position = useRef(new THREE.Vector3(0, 0.5, 15));
  const rotationY = useRef(Math.PI);
  
  // AI States
  const [aiState, setAiState] = useState("PATROL");
  const aiStateRef = useRef("PATROL");
  const [currentRoom, setCurrentRoom] = useState("Hall");
  const [targetPosUI, setTargetPosUI] = useState(new THREE.Vector3());
  const [suspicionScoreUI, setSuspicionScoreUI] = useState(0);
  const [isVisibleUI, setIsVisibleUI] = useState(false);
  const [lastInspectedUI, setLastInspectedUI] = useState("None");

  const navigationQueue = useRef([]);
  const targetPos = useRef(new THREE.Vector3(0, 0.5, 15));
  const pauseTimer = useRef(0);
  const suspicionScore = useRef(0);
  const inspectTimer = useRef(0);
  const searchTimer = useRef(0);
  const lastKnownPlayerPos = useRef(new THREE.Vector3());
  
  const evalTimer = useRef(0);
  const animTime = useRef(0);
  
  // Head look animation for INSPECT
  const lookYaw = useRef(0);
  const lookPitch = useRef(0);

  // Helper to change state securely
  const changeState = (newState) => {
    aiStateRef.current = newState;
    setAiState(newState);
  };

  useEffect(() => {
    if (resetTriggerRef && resetTriggerRef.current > 0) {
      position.current.set(0, 0.5, 15);
      rotationY.current = Math.PI;
      changeState("PATROL");
      navigationQueue.current = [];
      targetPos.current = new THREE.Vector3(0, 0.5, 15);
      pauseTimer.current = 0;
      suspicionScore.current = 0;
      inspectTimer.current = 0;
      searchTimer.current = 0;
      lookYaw.current = 0;
      lookPitch.current = 0;
    }
  }, [resetTriggerRef?.current]);

  const generatePatrolTarget = () => {
    const curRoom = getRoomForPos(position.current);
    const rand = Math.random();
    let nextRoom = "Hall";
    if (rand > 0.35 && rand <= 0.70) nextRoom = "Kitchen";
    else if (rand > 0.70) nextRoom = "Bedroom";
    
    // Fallback if same room
    if (nextRoom === curRoom && Math.random() > 0.5) {
      nextRoom = (curRoom === "Hall") ? "Kitchen" : "Hall"; 
    }

    let finalPt = null;
    for (let i = 0; i < 15; i++) {
      let pt = getRandomPointInRoom(nextRoom);
      if (!checkObstacleOverlap(pt, 1.2)) {
        finalPt = pt;
        break;
      }
    }
    if (!finalPt) finalPt = getRandomPointInRoom(nextRoom); // fallback
    
    navigationQueue.current = [];
    
    if (curRoom !== nextRoom) {
      if (curRoom === "Kitchen" || curRoom === "Bedroom") {
        navigationQueue.current.push(DOORS[curRoom].clone());
      }
      if (nextRoom === "Kitchen" || nextRoom === "Bedroom") {
        navigationQueue.current.push(DOORS[nextRoom].clone());
      }
    }
    navigationQueue.current.push(finalPt);
    
    targetPos.current = navigationQueue.current.shift();
    setCurrentRoom(curRoom);
    setTargetPosUI(targetPos.current);
  };

  useFrame((state, dt) => {
    if (gameState === "HIDE" || gameState === "WIN" || gameState === "LOSE") {
      animTime.current = 0;
      return;
    }

    const pos = position.current;
    let targetSpeed = 4;
    let isMoving = false;
    let playerVisible = false;

    // --- 1. VISION & SUSPICION (Every 250ms) ---
    evalTimer.current += dt;
    if (evalTimer.current >= 0.25) {
      evalTimer.current = 0;
      const distToPlayer = pos.distanceTo(playerPosRef.current);
      
      if (distToPlayer <= 8.0) {
        const dirToPlayer = playerPosRef.current.clone().sub(pos).normalize();
        const hunterForward = new THREE.Vector3(Math.sin(rotationY.current), 0, Math.cos(rotationY.current));
        const angle = hunterForward.angleTo(dirToPlayer);
        
        if (angle <= (35 * Math.PI / 180)) {
          const rayVec = playerPosRef.current.clone().sub(pos);
          rayVec.y += 0.5;
          const pivot = pos.clone();
          pivot.y += 0.5;

          let hitWall = false;
          for (const obs of OBSTACLES) {
            if (checkWallCollision(pivot, rayVec, obs) !== null) {
              hitWall = true; break;
            }
          }
          if (!hitWall) playerVisible = true;
        }
      }

      setIsVisibleUI(playerVisible);

      if (playerVisible && aiStateRef.current !== "CHASE") {
        let score = 0;
        const pMovedTime = playerMovedTimeRef ? playerMovedTimeRef.current : 0;
        const pFormTime = playerFormChangedTimeRef ? playerFormChangedTimeRef.current : 0;
        const now = performance.now();
        
        // Human? Instant catch/chase
        if (playerFormName === "Human") {
          score = 100;
        } else {
          // Object Suspicion rules
          if ((now - pMovedTime) < 2000) score += 40;
          if ((now - pFormTime) < 2000) score += 30;
          
          let closestDist = Infinity;
          let closestType = "";
          for (const f of FURNITURE) {
            const d = playerPosRef.current.distanceTo(new THREE.Vector3(f.pos[0], 0, f.pos[2]));
            if (d < closestDist) {
              closestDist = d;
              closestType = f.type;
            }
          }
          
          if (closestDist > 3.0) score += 15;
          if (Math.abs(playerPosRef.current.z - 5) < 2.0 && Math.abs(playerPosRef.current.x) > 5) score += 10;
          if (playerFormName.toLowerCase() === closestType.replace(/_/g, ' ')) score -= 20;
          if ((now - pMovedTime) > 15000) score -= 15;
        }
        
        // Decay score if perfectly still and matching naturally, but never below 0
        suspicionScore.current = Math.max(0, suspicionScore.current + score);
        setSuspicionScoreUI(suspicionScore.current);
        
        if (suspicionScore.current > 70) {
          changeState("CHASE");
        } else if (suspicionScore.current > 50 && aiStateRef.current === "PATROL") {
          changeState("INVESTIGATE");
        }
      } else if (!playerVisible) {
        // Slowly lose suspicion if out of sight
        suspicionScore.current = Math.max(0, suspicionScore.current - 10);
        setSuspicionScoreUI(suspicionScore.current);
      }
      
      if (playerVisible) {
        lastKnownPlayerPos.current.copy(playerPosRef.current);
      }
    }

    // --- 2. IMMEDIATE CATCH ---
    if (pos.distanceTo(playerPosRef.current) <= 1.5 && (suspicionScore.current > 70 || aiStateRef.current === "CHASE")) {
      window.dispatchEvent(new CustomEvent('hunter-catch'));
    }

    // --- 3. STATE MACHINE LOGIC ---
    const st = aiStateRef.current;
    
    if (st === "PATROL") {
      if (pauseTimer.current > 0) {
        pauseTimer.current -= dt;
      } else {
        if (!targetPos.current) generatePatrolTarget();
        
        const dist = pos.distanceTo(targetPos.current);
        if (dist < 0.5) {
          if (navigationQueue.current.length > 0) {
            targetPos.current = navigationQueue.current.shift();
            setTargetPosUI(targetPos.current);
          } else {
            pauseTimer.current = 1.0 + Math.random() * 2.0; // Pause 1-3 sec
            targetPos.current = null;
          }
        } else {
          isMoving = true;
          // Simple obstacle avoidance raycast (left/right steer)
          // For V1, just strictly move. 
        }
      }
      lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5 * dt);
      lookPitch.current = THREE.MathUtils.lerp(lookPitch.current, 0, 5 * dt);
    } 
    else if (st === "INVESTIGATE") {
      targetPos.current = lastKnownPlayerPos.current.clone();
      const dist = pos.distanceTo(targetPos.current);
      if (dist < 2.5) {
        changeState("INSPECT");
        inspectTimer.current = 2.0; // Inspect for 2 seconds
        setLastInspectedUI(playerFormName);
      } else {
        isMoving = true;
      }
      lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5 * dt);
      lookPitch.current = THREE.MathUtils.lerp(lookPitch.current, 0, 5 * dt);
    }
    else if (st === "INSPECT") {
      inspectTimer.current -= dt;
      // Procedural head looking
      const t = 2.0 - inspectTimer.current;
      if (t < 0.5) lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0.5, 5*dt); // look right
      else if (t < 1.0) lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, -0.5, 5*dt); // look left
      else {
        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5*dt);
        lookPitch.current = THREE.MathUtils.lerp(lookPitch.current, 0.3, 5*dt); // look down
      }
      
      if (inspectTimer.current <= 0) {
        if (suspicionScore.current > 50) {
          changeState("CHASE");
        } else {
          changeState("PATROL");
          suspicionScore.current = 0;
          generatePatrolTarget();
        }
      }
    }
    else if (st === "CHASE") {
      targetSpeed = 6;
      if (playerVisible) {
        targetPos.current = playerPosRef.current.clone();
        isMoving = true;
        searchTimer.current = 5.0;
      } else {
        // Run to last known, then search
        if (pos.distanceTo(lastKnownPlayerPos.current) > 1.0) {
          targetPos.current = lastKnownPlayerPos.current.clone();
          isMoving = true;
        } else {
          changeState("RETURN");
        }
      }
      lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5 * dt);
      lookPitch.current = THREE.MathUtils.lerp(lookPitch.current, 0, 5 * dt);
    }
    else if (st === "RETURN") {
      searchTimer.current -= dt;
      // Look around frantically
      lookYaw.current = Math.sin(searchTimer.current * 10) * 0.8;
      
      if (searchTimer.current <= 0) {
        changeState("PATROL");
        suspicionScore.current = 0;
        generatePatrolTarget();
      }
    }

    // --- 4. APPLY MOVEMENT ---
    if (isMoving && targetPos.current) {
      const moveDir = targetPos.current.clone().sub(pos);
      moveDir.y = 0; 
      
      if (moveDir.lengthSq() > 0.001) {
        moveDir.normalize();
        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetYaw - rotationY.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rotationY.current += diff * (st === "CHASE" ? 15 : 6) * dt;

        pos.addScaledVector(moveDir, targetSpeed * dt);
        animTime.current += dt * (targetSpeed / 4);
      }
    } else {
      animTime.current += dt;
    }

    if (hunterPosRef) hunterPosRef.current.copy(pos);
    if (hunterGroup.current) {
      hunterGroup.current.position.copy(pos);
      hunterGroup.current.rotation.y = rotationY.current;
    }

    // --- 5. ANIMATION & IK ---
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
        const isC = (st === "CHASE");
        const freq = isC ? 11.0 : 7.0;
        const legAmp = isC ? 0.60 : 0.35;
        const armAmp = isC ? 0.55 : 0.30;
        
        targetLeftLegX = Math.sin(time * freq) * legAmp;
        targetRightLegX = -Math.sin(time * freq) * legAmp;
        targetLeftArmX = -Math.sin(time * freq) * armAmp;
        targetRightArmX = Math.sin(time * freq) * armAmp;

        bobOffset = Math.abs(Math.sin(time * freq)) * (isC ? 0.09 : 0.05) - (isC ? 0.045 : 0.025);
        targetTorsoX = (isC ? 0.12 : 0.04) + Math.sin(time * freq) * (isC ? 0.02 : 0.01);
        targetTorsoY = Math.sin(time * freq) * (isC ? 0.12 : 0.05);
        targetHeadX = isC ? -0.04 : 0;
        targetHeadY = -Math.sin(time * freq) * (isC ? 0.03 : 0.02);
      }

      // Add additive head look
      targetHeadX += lookPitch.current;
      targetHeadY += lookYaw.current;

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
      {/* HTML DEBUG HUD FOR HUNTER */}
      <Html position={[0, 2.2, 0]} center>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          color: '#34d399',
          padding: '8px 12px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          border: '1px solid #34d399',
          pointerEvents: 'none'
        }}>
          <div>STATE: {aiState}</div>
          <div>ROOM: {currentRoom}</div>
          <div>TARGET: {targetPosUI ? `${targetPosUI.x.toFixed(1)}, ${targetPosUI.z.toFixed(1)}` : 'None'}</div>
          <div>SUSPICION: {suspicionScoreUI.toFixed(0)}</div>
          <div>VISIBLE: {isVisibleUI ? 'YES' : 'NO'}</div>
          <div>INSPECTED: {lastInspectedUI}</div>
        </div>
      </Html>

      {/* HUNTER MESH */}
      <group ref={bodyMesh}>
        <group ref={torsoGroup} position={[0, 0.7, 0]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.68, 0.36]} />
            <meshStandardMaterial color="#722F37" roughness={0.85} /> 
          </mesh>
          <mesh position={[0, 0.03, 0]} castShadow>
            <boxGeometry args={[0.61, 0.06, 0.37]} />
            <meshStandardMaterial color="#722F37" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.02, 0]} castShadow>
            <boxGeometry args={[0.57, 0.04, 0.34]} />
            <meshStandardMaterial color="#2d2a29" roughness={0.9} /> 
          </mesh>
          <mesh position={[0, 0.69, 0]} castShadow>
            <boxGeometry args={[0.2, 0.03, 0.2]} />
            <meshStandardMaterial color="#2d2a29" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.52, -0.15]} castShadow>
            <boxGeometry args={[0.42, 0.42, 0.16]} />
            <meshStandardMaterial color="#722F37" roughness={0.85} />
          </mesh>

          <group ref={headMesh} position={[0, 0.7, 0]}>
            <mesh position={[0, 0.05, 0]} castShadow>
              <boxGeometry args={[0.12, 0.1, 0.12]} />
              <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[0.32, 0.32, 0.32]} />
              <meshStandardMaterial color="#f5ebe0" roughness={0.7} />
            </mesh>
            {/* Red Eyes */}
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
              <meshStandardMaterial color="#111111" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.22, -0.15]} castShadow>
              <boxGeometry args={[0.34, 0.18, 0.05]} />
              <meshStandardMaterial color="#111111" roughness={0.9} />
            </mesh>
          </group>

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

        <group position={[0, 0.7, 0]}>
          <group ref={leftLeg} position={[-0.15, 0, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.24, 0.6, 0.24]} />
              <meshStandardMaterial color="#2d2a29" roughness={0.95} />
            </mesh>
            <mesh position={[0, -0.65, 0.04]} castShadow>
              <boxGeometry args={[0.22, 0.1, 0.32]} />
              <meshStandardMaterial color="#111111" roughness={0.5} />
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
