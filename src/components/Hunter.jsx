import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OBSTACLES, FURNITURE, WALLS } from "../data/mapData";
import { Html } from "@react-three/drei";

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

  let tMin = -Infinity, tMax = Infinity;
  if (Math.abs(d.x) < 1e-8) { if (p.x < minX || p.x > maxX) return null; } else {
    const t1 = (minX - p.x) / d.x; const t2 = (maxX - p.x) / d.x;
    tMin = Math.max(tMin, Math.min(t1, t2)); tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (Math.abs(d.y) < 1e-8) { if (p.y < minY || p.y > maxY) return null; } else {
    const t1 = (minY - p.y) / d.y; const t2 = (maxY - p.y) / d.y;
    tMin = Math.max(tMin, Math.min(t1, t2)); tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (Math.abs(d.z) < 1e-8) { if (p.z < minZ || p.z > maxZ) return null; } else {
    const t1 = (minZ - p.z) / d.z; const t2 = (maxZ - p.z) / d.z;
    tMin = Math.max(tMin, Math.min(t1, t2)); tMax = Math.min(tMax, Math.max(t1, t2));
  }
  if (tMin > tMax || tMax < 0 || tMin > 1) return null;
  return Math.max(0, tMin);
};

function getRoomForPos(pos) {
  if (pos.z > 5) return "Hall";
  if (pos.x < 0) return "Kitchen";
  return "Bedroom";
}

function checkObstacleOverlap(pos, radius = 1.0) {
  for (const obs of OBSTACLES) {
    const hw = obs.size[0] / 2 + radius, hh = obs.size[1] / 2, hd = obs.size[2] / 2 + radius;
    if (Math.abs(pos.x - obs.pos[0]) < hw && pos.y > obs.pos[1] - hh && pos.y < obs.pos[1] + hh && Math.abs(pos.z - obs.pos[2]) < hd) {
      return true;
    }
  }
  return false;
}

export default function Hunter({ gameState, playerPosRef, hunterPosRef, resetTriggerRef, playerMovedTimeRef, playerFormChangedTimeRef, playerFormName }) {
  const hunterGroup = useRef(); const bodyMesh = useRef(); const torsoGroup = useRef();
  const leftLeg = useRef(); const rightLeg = useRef(); const leftArm = useRef(); const rightArm = useRef();
  const headMesh = useRef();

  const position = useRef(new THREE.Vector3(0, 0.5, 15));
  const rotationY = useRef(Math.PI);
  const lookYaw = useRef(0);
  const lookPitch = useRef(0);
  const animTime = useRef(0);

  const aiStateRef = useRef("DECIDE_NEXT");
  const [aiStateUI, setAiStateUI] = useState("DECIDE_NEXT");
  const [visibleCountUI, setVisibleCountUI] = useState(0);
  const [suspicionScoreUI, setSuspicionScoreUI] = useState(0);

  const navigationQueue = useRef([]);
  const targetPos = useRef(null);
  const lastKnownPlayerPos = useRef(new THREE.Vector3());
  const inspectionTarget = useRef(null);
  const suspicionScore = useRef(0);
  const inspectedLocations = useRef([]);

  const phaseTimer = useRef(0);
  const scanTimer = useRef(0);
  const phaseStep = useRef(0);

  const changeState = (newState) => {
    aiStateRef.current = newState;
    setAiStateUI(newState);
    phaseTimer.current = 0;
    phaseStep.current = 0;
  };

  useEffect(() => {
    if (resetTriggerRef && resetTriggerRef.current > 0) {
      position.current.set(0, 0.5, 15);
      rotationY.current = Math.PI;
      changeState("DECIDE_NEXT");
      navigationQueue.current = [];
      targetPos.current = null;
      suspicionScore.current = 0;
      lookYaw.current = 0; lookPitch.current = 0;
      inspectedLocations.current = [];
    }
  }, [resetTriggerRef?.current]);

  const generateAntiRailTarget = () => {
    const curRoom = getRoomForPos(position.current);
    const r = Math.random();
    let tgtRoom = curRoom;
    let finalPt = null;

    if (r < 0.3) {
      // Corner
      const bounds = ROOMS[curRoom];
      const cx = Math.random() > 0.5 ? bounds.min.x + 2 : bounds.max.x - 2;
      const cz = Math.random() > 0.5 ? bounds.min.z + 2 : bounds.max.z - 2;
      finalPt = new THREE.Vector3(cx, 0.5, cz);
    } else if (r < 0.5) {
      // Cluster (near furniture)
      const roomFurn = FURNITURE.filter(f => getRoomForPos(new THREE.Vector3(...f.pos)) === curRoom);
      if (roomFurn.length > 0) {
        const f = roomFurn[Math.floor(Math.random() * roomFurn.length)];
        finalPt = new THREE.Vector3(f.pos[0] + (Math.random()*4-2), 0.5, f.pos[2] + (Math.random()*4-2));
      }
    } else if (r < 0.7) {
      // Revisit
      tgtRoom = (curRoom === "Hall") ? (Math.random()>0.5?"Kitchen":"Bedroom") : "Hall";
      finalPt = new THREE.Vector3(ROOMS[tgtRoom].min.x + 4, 0.5, ROOMS[tgtRoom].min.z + 4);
    } else if (r < 0.9) {
      // Scan Doorway
      finalPt = (curRoom === "Kitchen") ? DOORS.Kitchen.clone() : (curRoom === "Bedroom" ? DOORS.Bedroom.clone() : DOORS.Kitchen.clone());
    } else {
      // Random
      const rx = ROOMS[curRoom];
      finalPt = new THREE.Vector3(rx.min.x + Math.random()*(rx.max.x-rx.min.x), 0.5, rx.min.z + Math.random()*(rx.max.z-rx.min.z));
    }

    if (!finalPt) finalPt = position.current.clone();

    // Check Memory
    for (const mem of inspectedLocations.current) {
      if (finalPt.distanceTo(mem) < 2.0) {
        // Fallback random
        finalPt = position.current.clone();
        break;
      }
    }

    navigationQueue.current = [];
    tgtRoom = getRoomForPos(finalPt);
    if (curRoom !== tgtRoom) {
      if (curRoom === "Kitchen" || curRoom === "Bedroom") navigationQueue.current.push(DOORS[curRoom].clone());
      if (tgtRoom === "Kitchen" || tgtRoom === "Bedroom") navigationQueue.current.push(DOORS[tgtRoom].clone());
    }
    navigationQueue.current.push(finalPt);
    targetPos.current = navigationQueue.current.shift();
  };

  const executeVisualScan = () => {
    // 1. Gather all candidates (FURNITURE + Player)
    const candidates = FURNITURE.map(f => ({ isPlayer: false, pos: new THREE.Vector3(f.pos[0], 0.5, f.pos[2]), type: f.type, id: f.id }));
    candidates.push({ isPlayer: true, pos: playerPosRef.current.clone(), type: playerFormName, id: "player" });

    // 2. Filter by FOV and Range
    const pos = position.current;
    const forward = new THREE.Vector3(Math.sin(rotationY.current + lookYaw.current), 0, Math.cos(rotationY.current + lookYaw.current));
    
    let visible = [];
    for (const c of candidates) {
      const dist = pos.distanceTo(c.pos);
      if (dist < 9.0) {
        const dir = c.pos.clone().sub(pos).normalize();
        if (forward.angleTo(dir) <= (40 * Math.PI / 180)) {
          // Raycast Walls only
          const rayVec = c.pos.clone().sub(pos); rayVec.y += 0.5;
          const pivot = pos.clone(); pivot.y += 0.5;
          let hit = false;
          for (const wall of WALLS) {
            if (checkWallCollision(pivot, rayVec, wall) !== null) { hit = true; break; }
          }
          if (!hit) {
            visible.push({ ...c, dist });
          }
        }
      }
    }

    setVisibleCountUI(visible.length);

    // 3. Optimize: Sort by distance to center of vision, pick top 3
    visible.sort((a, b) => {
      const dirA = a.pos.clone().sub(pos).normalize();
      const dirB = b.pos.clone().sub(pos).normalize();
      return forward.angleTo(dirA) - forward.angleTo(dirB);
    });
    visible = visible.slice(0, 3);

    // 4. Suspicion Math
    let maxSus = 0;
    let mostSusObj = null;

    for (const c of visible) {
      let curSus = 0;
      
      // Floating check (simplified y check)
      if (c.pos.y > 1.5) curSus += 40;
      
      // Environment Checks
      let nearTable = false, nearWall = false;
      let clusterMatch = false;
      for (const f of FURNITURE) {
        if (f.id === c.id) continue;
        const d = c.pos.distanceTo(new THREE.Vector3(f.pos[0], 0.5, f.pos[2]));
        if (d < 2.5 && (f.type.includes("table") || f.type.includes("desk"))) nearTable = true;
        if (d < 1.5 && (f.type === c.type)) clusterMatch = true;
      }
      if (Math.abs(c.pos.x) > 23 || Math.abs(c.pos.x) < 2 || Math.abs(c.pos.z) > 23 || Math.abs(c.pos.z) < 2) nearWall = true;

      const type = c.type.toLowerCase();
      if (type.includes("chair") && !nearTable) curSus += 25;
      if (type.includes("plant") && !nearWall) curSus += 25;
      if (type.includes("box") && !nearWall) curSus += 25;
      if (clusterMatch) curSus -= 20;

      // Player specific checks (No cheating, we only know if we literally saw it move)
      if (c.isPlayer) {
        const pMovedTime = playerMovedTimeRef ? playerMovedTimeRef.current : 0;
        const pFormTime = playerFormChangedTimeRef ? playerFormChangedTimeRef.current : 0;
        const now = performance.now();
        
        if ((now - pMovedTime) < 2000) curSus += 60;
        if ((now - pFormTime) < 2000) curSus += 50;
        if ((now - pMovedTime) > 20000) curSus -= 20;
        
        if (type === "human") curSus += 100; // Human form immediately obvious
      }

      if (curSus > maxSus) {
        maxSus = curSus;
        mostSusObj = c;
      }
    }

    if (maxSus > 0) {
      suspicionScore.current = Math.min(100, suspicionScore.current + maxSus);
      setSuspicionScoreUI(suspicionScore.current);
      
      if (mostSusObj && mostSusObj.isPlayer) {
        lastKnownPlayerPos.current.copy(playerPosRef.current);
      }
      
      if (suspicionScore.current > 85) {
        changeState("CHASE");
      } else if (suspicionScore.current > 50 && aiStateRef.current !== "INSPECT_SCAN" && aiStateRef.current !== "INVESTIGATING") {
        inspectionTarget.current = mostSusObj.pos.clone();
        changeState("INVESTIGATING");
      }
    } else {
      suspicionScore.current = Math.max(0, suspicionScore.current - 10);
      setSuspicionScoreUI(suspicionScore.current);
    }
  };

  useFrame((state, dt) => {
    if (gameState === "HIDE" || gameState === "WIN" || gameState === "LOSE") { animTime.current = 0; return; }

    const pos = position.current;
    let targetSpeed = 5;
    let isMoving = false;
    const st = aiStateRef.current;

    // Fast Immediate Catch
    if (pos.distanceTo(playerPosRef.current) <= 1.5 && (suspicionScore.current > 60 || st === "CHASE")) {
      window.dispatchEvent(new CustomEvent('hunter-catch'));
    }

    scanTimer.current -= dt;
    if (scanTimer.current <= 0 && st !== "CHASE") {
      executeVisualScan();
      scanTimer.current = 0.5; 
    }

    if (st === "DECIDE_NEXT") {
      generateAntiRailTarget();
      changeState("WALKING");
    }
    else if (st === "WALKING") {
      const dist = pos.distanceTo(targetPos.current);
      if (dist < 0.5) {
        if (navigationQueue.current.length > 0) {
          targetPos.current = navigationQueue.current.shift();
        } else {
          changeState("ENTRY_SCAN");
        }
      } else {
        isMoving = true;
      }
      lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5 * dt);
    }
    else if (st === "ENTRY_SCAN") {
      phaseTimer.current += dt;
      if (phaseStep.current === 0) {
        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0.78, 5*dt); // left
        if (phaseTimer.current > 0.6) { phaseStep.current = 1; phaseTimer.current = 0; executeVisualScan(); }
      } else if (phaseStep.current === 1) {
        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5*dt); // center
        if (phaseTimer.current > 0.6) { phaseStep.current = 2; phaseTimer.current = 0; executeVisualScan(); }
      } else if (phaseStep.current === 2) {
        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, -0.78, 5*dt); // right
        if (phaseTimer.current > 0.6) { phaseStep.current = 3; phaseTimer.current = 0; executeVisualScan(); }
      } else {
        changeState("DECIDE_NEXT");
      }
    }
    else if (st === "INVESTIGATING") {
      const dist = pos.distanceTo(inspectionTarget.current);
      targetPos.current = inspectionTarget.current;
      if (dist < 2.5) {
        changeState("INSPECT_SCAN");
      } else {
        isMoving = true;
      }
      lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5 * dt);
    }
    else if (st === "INSPECT_SCAN") {
      phaseTimer.current += dt;
      if (phaseStep.current === 0) {
        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0.78, 5*dt); 
        if (phaseTimer.current > 1.2) { phaseStep.current = 1; phaseTimer.current = 0; executeVisualScan(); }
      } else if (phaseStep.current === 1) {
        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5*dt); 
        if (phaseTimer.current > 1.2) { phaseStep.current = 2; phaseTimer.current = 0; executeVisualScan(); }
      } else if (phaseStep.current === 2) {
        lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, -0.78, 5*dt); 
        if (phaseTimer.current > 1.2) { phaseStep.current = 3; phaseTimer.current = 0; executeVisualScan(); }
      } else {
        // Evaluate Error Chance
        if (suspicionScore.current > 50 && Math.random() > 0.20) {
          changeState("CHASE");
        } else {
          suspicionScore.current = 0; // Made a mistake or gave up
          setSuspicionScoreUI(0);
          inspectedLocations.current.push(inspectionTarget.current.clone());
          if (inspectedLocations.current.length > 8) inspectedLocations.current.shift();
          changeState("DECIDE_NEXT");
        }
      }
    }
    else if (st === "CHASE") {
      targetSpeed = 6.5;
      targetPos.current = playerPosRef.current.clone();
      isMoving = true;
      
      phaseTimer.current += dt;
      if (phaseTimer.current > 5.0 && pos.distanceTo(playerPosRef.current) > 10.0) {
        // Lost them
        suspicionScore.current = 0;
        changeState("LOST");
      }
      lookYaw.current = THREE.MathUtils.lerp(lookYaw.current, 0, 5 * dt);
    }
    else if (st === "LOST") {
      phaseTimer.current += dt;
      lookYaw.current = Math.sin(phaseTimer.current * 10) * 0.8;
      if (phaseTimer.current > 4.0) {
        changeState("DECIDE_NEXT");
      }
    }

    if (isMoving && targetPos.current) {
      const moveDir = targetPos.current.clone().sub(pos); moveDir.y = 0; 
      if (moveDir.lengthSq() > 0.001) {
        moveDir.normalize();
        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetYaw - rotationY.current;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        rotationY.current += diff * (st === "CHASE" ? 15 : 8) * dt;

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

    // --- ANIMATION ---
    const time = animTime.current;
    if (bodyMesh.current) {
      let bobOffset = 0, targetTorsoX = 0, targetTorsoY = 0, targetHeadX = 0, targetHeadY = 0;
      let targetLeftLegX = 0, targetRightLegX = 0, targetLeftArmX = 0, targetRightArmX = 0;

      if (!isMoving) {
        bobOffset = Math.sin(time * 2.5) * 0.02;
        targetTorsoX = Math.sin(time * 2.5) * 0.01;
        targetHeadY = Math.sin(time * 0.8) * 0.12;
        targetLeftArmX = Math.sin(time * 2.5) * 0.03;
        targetRightArmX = -Math.sin(time * 2.5) * 0.03;
      } else {
        const isC = (st === "CHASE");
        const freq = isC ? 12.0 : 8.0;
        const legAmp = isC ? 0.65 : 0.40;
        const armAmp = isC ? 0.60 : 0.35;
        
        targetLeftLegX = Math.sin(time * freq) * legAmp;
        targetRightLegX = -Math.sin(time * freq) * legAmp;
        targetLeftArmX = -Math.sin(time * freq) * armAmp;
        targetRightArmX = Math.sin(time * freq) * armAmp;

        bobOffset = Math.abs(Math.sin(time * freq)) * (isC ? 0.1 : 0.05) - (isC ? 0.05 : 0.025);
        targetTorsoX = (isC ? 0.15 : 0.05) + Math.sin(time * freq) * 0.02;
        targetTorsoY = Math.sin(time * freq) * (isC ? 0.12 : 0.05);
        targetHeadX = isC ? -0.05 : 0;
        targetHeadY = -Math.sin(time * freq) * 0.03;
      }

      targetHeadX += lookPitch.current;
      targetHeadY += lookYaw.current;

      const lerpSpeed = 12;
      bodyMesh.current.position.y = THREE.MathUtils.lerp(bodyMesh.current.position.y, bobOffset, lerpSpeed * dt);
      
      if (torsoGroup.current) {
        torsoGroup.current.rotation.x = THREE.MathUtils.lerp(torsoGroup.current.rotation.x, targetTorsoX, lerpSpeed * dt);
        torsoGroup.current.rotation.y = THREE.MathUtils.lerp(torsoGroup.current.rotation.y, targetTorsoY, lerpSpeed * dt);
      }
      if (headMesh.current) {
        headMesh.current.rotation.x = THREE.MathUtils.lerp(headMesh.current.rotation.x, targetHeadX, lerpSpeed * dt);
        headMesh.current.rotation.y = THREE.MathUtils.lerp(headMesh.current.rotation.y, targetHeadY, lerpSpeed * dt);
      }
      if (leftLeg.current) { leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, targetLeftLegX, lerpSpeed * dt); }
      if (rightLeg.current) { rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, targetRightLegX, lerpSpeed * dt); }
      if (leftArm.current) { leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, targetLeftArmX, lerpSpeed * dt); }
      if (rightArm.current) { rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, targetRightArmX, lerpSpeed * dt); }
    }
  });

  return (
    <group ref={hunterGroup}>
      <Html position={[0, 2.3, 0]} center zIndexRange={[100, 0]}>
        <div style={{
          background: 'rgba(0,0,0,0.85)', color: '#3b82f6', padding: '6px 10px',
          borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px',
          whiteSpace: 'nowrap', border: '1px solid #3b82f6', pointerEvents: 'none'
        }}>
          <div>[V3 AI]</div>
          <div>STATE: {aiStateUI}</div>
          <div>SUSPICION: {suspicionScoreUI.toFixed(0)}</div>
          <div>VISIBLE OBJS: {visibleCountUI}</div>
        </div>
      </Html>
      <group ref={bodyMesh}>
        <group ref={torsoGroup} position={[0, 0.7, 0]}>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow><boxGeometry args={[0.6, 0.68, 0.36]} /><meshStandardMaterial color="#722F37" roughness={0.85} /></mesh>
          <mesh position={[0, 0.03, 0]} castShadow><boxGeometry args={[0.61, 0.06, 0.37]} /><meshStandardMaterial color="#722F37" roughness={0.85} /></mesh>
          <mesh position={[0, -0.02, 0]} castShadow><boxGeometry args={[0.57, 0.04, 0.34]} /><meshStandardMaterial color="#2d2a29" roughness={0.9} /></mesh>
          <mesh position={[0, 0.69, 0]} castShadow><boxGeometry args={[0.2, 0.03, 0.2]} /><meshStandardMaterial color="#2d2a29" roughness={0.9} /></mesh>
          <mesh position={[0, 0.52, -0.15]} castShadow><boxGeometry args={[0.42, 0.42, 0.16]} /><meshStandardMaterial color="#722F37" roughness={0.85} /></mesh>

          <group ref={headMesh} position={[0, 0.7, 0]}>
            <mesh position={[0, 0.05, 0]} castShadow><boxGeometry args={[0.12, 0.1, 0.12]} /><meshStandardMaterial color="#f5ebe0" roughness={0.7} /></mesh>
            <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.32, 0.32, 0.32]} /><meshStandardMaterial color="#f5ebe0" roughness={0.7} /></mesh>
            <mesh position={[-0.07, 0.18, 0.161]} castShadow><boxGeometry args={[0.06, 0.05, 0.01]} /><meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2.0} roughness={0.1} /></mesh>
            <mesh position={[0.07, 0.18, 0.161]} castShadow><boxGeometry args={[0.06, 0.05, 0.01]} /><meshStandardMaterial color="#ff2222" emissive="#ff0000" emissiveIntensity={2.0} roughness={0.1} /></mesh>
            <mesh position={[0, 0.32, 0.01]} castShadow><boxGeometry args={[0.34, 0.12, 0.34]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
            <mesh position={[0, 0.22, -0.15]} castShadow><boxGeometry args={[0.34, 0.18, 0.05]} /><meshStandardMaterial color="#111111" roughness={0.9} /></mesh>
          </group>
          <group ref={leftArm} position={[-0.38, 0.65, 0]}><mesh position={[0, -0.225, 0]} castShadow><boxGeometry args={[0.18, 0.45, 0.18]} /><meshStandardMaterial color="#722F37" roughness={0.85} /></mesh><mesh position={[0, -0.5, 0]} castShadow><boxGeometry args={[0.14, 0.12, 0.14]} /><meshStandardMaterial color="#f5ebe0" roughness={0.7} /></mesh></group>
          <group ref={rightArm} position={[0.38, 0.65, 0]}><mesh position={[0, -0.225, 0]} castShadow><boxGeometry args={[0.18, 0.45, 0.18]} /><meshStandardMaterial color="#722F37" roughness={0.85} /></mesh><mesh position={[0, -0.5, 0]} castShadow><boxGeometry args={[0.14, 0.12, 0.14]} /><meshStandardMaterial color="#f5ebe0" roughness={0.7} /></mesh></group>
        </group>
        <group position={[0, 0.7, 0]}>
          <group ref={leftLeg} position={[-0.15, 0, 0]}><mesh position={[0, -0.3, 0]} castShadow><boxGeometry args={[0.24, 0.6, 0.24]} /><meshStandardMaterial color="#2d2a29" roughness={0.95} /></mesh><mesh position={[0, -0.65, 0.04]} castShadow><boxGeometry args={[0.22, 0.1, 0.32]} /><meshStandardMaterial color="#111111" roughness={0.5} /></mesh></group>
          <group ref={rightLeg} position={[0.15, 0, 0]}><mesh position={[0, -0.3, 0]} castShadow><boxGeometry args={[0.24, 0.6, 0.24]} /><meshStandardMaterial color="#2d2a29" roughness={0.95} /></mesh><mesh position={[0, -0.65, 0.04]} castShadow><boxGeometry args={[0.22, 0.1, 0.32]} /><meshStandardMaterial color="#111111" roughness={0.5} /></mesh></group>
        </group>
      </group>
    </group>
  );
}
