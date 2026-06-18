import React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WALLS, FURNITURE } from "../data/mapData";

// Slab intersection method to find ray-AABB entry point
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

export default function CameraManager({
  cameraMode,
  gameplayState,
  activeObject,
  position,
  mouseRotation,
  currentLookAt,
  zoomFactor,
  transitionT,
}) {
  const { camera } = useThree();

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);

    // 1. Interpolate transition parameter (0 = First Person, 1 = Third Person)
    const targetT = cameraMode === "TP" ? 1.0 : 0.0;
    transitionT.current = THREE.MathUtils.lerp(
      transitionT.current,
      targetT,
      12 * dt
    );

    // Clamp boundary values to prevent infinite micro-lerping
    if (Math.abs(transitionT.current - targetT) < 0.001) {
      transitionT.current = targetT;
    }

    // 2. Fetch look angles (theta = yaw, phi = pitch)
    const theta = mouseRotation.current.x;
    const phi = mouseRotation.current.y;

    // 3. Calculate directions based on yaw/pitch
    const backDir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.sin(phi),
      Math.cos(theta) * Math.cos(phi)
    );
    const forwardDir = backDir.clone().negate();

    const rightDir = new THREE.Vector3(
      Math.cos(theta),
      0,
      -Math.sin(theta)
    );

    // 4. Set Pivot Height, Shoulder Offset, and Distance dynamically based on State
    let pivotHeight = 1.6; // standard height of eye level
    let shoulderOffset = 0.7;
    let baseMinDist = 2.0;
    let baseMaxDist = 5.0;

    if (gameplayState === "object" && activeObject) {
      const size = activeObject.size;
      const maxDim = Math.max(size[0], size[1], size[2]);
      
      pivotHeight = size[1] / 2; // Center of the object
      shoulderOffset = 0.0; // Center the camera orbit for objects
      baseMinDist = maxDim * 1.2;
      baseMaxDist = maxDim * 4.0;
    } else if (gameplayState === "hunter") {
      pivotHeight = 1.6;
      shoulderOffset = 0.7;
      baseMinDist = 2.0;
      baseMaxDist = 5.0;
    }

    // Pivot absolute position
    const pivot = new THREE.Vector3(
      position.current.x,
      position.current.y + pivotHeight,
      position.current.z
    );

    // Calculate distance and side offset scaled by transition parameter
    const maxDistance = baseMinDist + zoomFactor.current * (baseMaxDist - baseMinDist);
    const curDistance = transitionT.current * maxDistance;
    const curShoulderOffset = transitionT.current * shoulderOffset;

    // Ideal camera position before collision check
    const idealCamPos = new THREE.Vector3()
      .copy(pivot)
      .addScaledVector(backDir, curDistance)
      .addScaledVector(rightDir, curShoulderOffset);

    let finalCamPos = idealCamPos.clone();

    // 5. Camera Collision (only active if distance is non-trivial)
    if (curDistance > 0.05) {
      const rayVec = new THREE.Vector3().subVectors(idealCamPos, pivot);
      const rayLen = rayVec.length();

      let minT = 1.0;

      if (rayLen > 0.001) {
        // Compile physical obstacles (exclude player's active object, and ignore tiny props to avoid jitter)
        const cameraObstacles = [
          ...WALLS,
          ...FURNITURE.filter((f) => {
            if (activeObject && f.id === activeObject.id) return false;
            const maxDim = Math.max(f.size[0], f.size[1], f.size[2]);
            return maxDim > 0.6; // Only collide with larger objects
          }),
          { pos: [0, 5.9, 5], size: [60, 0.2, 50] }, // Ceiling
          { pos: [0, 0.1, 5], size: [60, 0.2, 50] }, // Floor
        ];

        for (const wall of cameraObstacles) {
          const t = checkWallCollision(pivot, rayVec, wall);
          if (t !== null && t < minT) {
            minT = t;
          }
        }
      }

      // Apply safety margin to keep camera frustum from clipping into geometries
      const safetyMargin = 0.25;
      const finalDistance = Math.max(0.0, rayLen * minT - safetyMargin);

      finalCamPos.copy(pivot).addScaledVector(rayVec.clone().normalize(), finalDistance);
    }

    // 6. Position and lookAt target interpolation
    camera.position.lerp(finalCamPos, 15 * dt);

    // LookAt targets for FP and TP
    const lookAtFP = new THREE.Vector3().copy(pivot).addScaledVector(forwardDir, 10);
    const lookAtTP = new THREE.Vector3().copy(pivot).addScaledVector(rightDir, curShoulderOffset);
    const targetLookAt = new THREE.Vector3().lerpVectors(lookAtFP, lookAtTP, transitionT.current);

    currentLookAt.current.lerp(targetLookAt, 15 * dt);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
