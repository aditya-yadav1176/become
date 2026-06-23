import React, { useRef, useEffect, useState, useLayoutEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OBSTACLES, WALLS, FURNITURE } from "../data/mapData";
import { useKeyboard } from "../hooks/useKeyboard";
import { FurnitureItem } from "./shared/FurnitureItem";

const isAllowedProp = (item) => {
  const allowed = [
    "chair",
    "plant",
    "lamp",
    "cardboard_box",
    "wooden_crate",
    "small_table",
    "stool",
    "tv_screen"
  ];
  return allowed.includes(item.type);
};

const getPriorityWeight = (type) => {
  if (type === "chair") return 1;
  if (type === "cardboard_box" || type === "wooden_crate") return 2;
  if (type === "plant") return 3;
  if (type === "lamp" || type === "desk_lamp") return 4;
  if (type === "stool") return 5;
  if (type === "tv_screen") return 6;
  return 7; // small_table or others
};

const getPropDisplayName = (type) => {
  if (type === "chair") return "Chair";
  if (type === "stool") return "Stool";
  if (type === "plant") return "Plant";
  if (type === "lamp") return "Lamp";
  if (type === "desk_lamp") return "Desk Lamp";
  if (type === "cardboard_box") return "Box";
  if (type === "wooden_crate") return "Crate";
  if (type === "small_table") return "Table";
  if (type === "tv_screen") return "TV";
  return type;
};

const getPropSpeedFactor = (type) => {
  if (type === "chair" || type === "stool") return 0.9;
  if (type === "plant") return 0.8;
  if (type === "cardboard_box" || type === "wooden_crate") return 0.7;
  if (type === "lamp" || type === "desk_lamp") return 0.6;
  if (type === "tv_screen") return 0.5;
  return 0.75; // Fallback
};

const isJumpAllowed = (type) => {
  if (type === "chair" || type === "stool") return true;
  if (type === "cardboard_box" || type === "wooden_crate") return true;
  if (type === "plant") return true;
  return false;
};



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

export default function Character({ isLocked }) {
  const { camera } = useThree();
  const keyboard = useKeyboard();

  // Transformation states and refs
  const [transformProp, setTransformProp] = useState(null);
  const [yOffset, setYOffset] = useState(0);

  const transformScale = transformProp ? (transformProp.scale || [1, 1, 1]) : [1, 1, 1];

  const nearestPropRef = useRef(null);
  const scanTimer = useRef(0);
  const lastTransformTime = useRef(0);
  const propGroupRef = useRef();
  
  // Hold-to-revert tracking refs
  const keyEPressedRef = useRef(false);
  const keyEStartTimeRef = useRef(0);
  const keyEHoldTimeoutRef = useRef(null);
  const keyEHoldTriggeredRef = useRef(false);

  // Landing speed damping ref
  const landDampingTimer = useRef(0);

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

  const playerRadius = 0.8;
  const playerHeight = 1.8;

  const camDistance = useRef(3.5); // Default camera distance

  // Handle mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e) => {
      const zoomSpeed = 0.005;
      camDistance.current = Math.max(2.0, Math.min(5.0, camDistance.current + e.deltaY * zoomSpeed));
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Handle mouse movement for camera orbit
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isLocked) return;

      // Camera orbit
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

  const resolvePlayerOverlap = (pos, radius, height, ignoreId = null) => {
    const maxIterations = 5;
    for (let iter = 0; iter < maxIterations; iter++) {
      let overlapCount = 0;

      for (const obs of OBSTACLES) {
        if (ignoreId && obs.id === ignoreId) {
          continue;
        }

        // Obstacle AABB
        const oMinX = obs.pos[0] - obs.size[0] / 2;
        const oMaxX = obs.pos[0] + obs.size[0] / 2;
        const oMinZ = obs.pos[2] - obs.size[2] / 2;
        const oMaxZ = obs.pos[2] + obs.size[2] / 2;
        const oMinY = obs.pos[1] - obs.size[1] / 2;
        const oMaxY = obs.pos[1] + obs.size[1] / 2;

        // Player AABB approximation
        const pMinX = pos.x - radius;
        const pMaxX = pos.x + radius;
        const pMinZ = pos.z - radius;
        const pMaxZ = pos.z + radius;
        const pMinY = pos.y;
        const pMaxY = pos.y + height;

        const overlapX = Math.min(pMaxX, oMaxX) - Math.max(pMinX, oMinX);
        const overlapZ = Math.min(pMaxZ, oMaxZ) - Math.max(pMinZ, oMinZ);
        const overlapY = Math.min(pMaxY, oMaxY) - Math.max(pMinY, oMinY);

        if (overlapX > 0 && overlapZ > 0 && overlapY > 0) {
          overlapCount++;
          // Push along shallowest axis
          if (overlapX < overlapZ && overlapX < overlapY) {
            const pushX = pos.x > obs.pos[0] ? (overlapX + 0.05) : -(overlapX + 0.05);
            pos.x += pushX;
          } else if (overlapZ < overlapX && overlapZ < overlapY) {
            const pushZ = pos.z > obs.pos[2] ? (overlapZ + 0.05) : -(overlapZ + 0.05);
            pos.z += pushZ;
          } else {
            if (pos.y > obs.pos[1]) {
              pos.y += (overlapY + 0.05);
            } else {
              pos.y -= (overlapY + 0.05);
            }
          }
        }
      }

      // Check world bounds limit
      const limit = 98;
      if (pos.x < -limit) { pos.x = -limit; }
      if (pos.x > limit) { pos.x = limit; }
      if (pos.z < -limit) { pos.z = -limit; }
      if (pos.z > limit) { pos.z = limit; }

      if (overlapCount === 0) {
        break;
      }
    }

    // Ground snap post-separation
    let highestGroundY = 0;
    for (const obs of OBSTACLES) {
      if (ignoreId && obs.id === ignoreId) {
        continue;
      }
      const oMinX = obs.pos[0] - obs.size[0] / 2;
      const oMaxX = obs.pos[0] + obs.size[0] / 2;
      const oMinZ = obs.pos[2] - obs.size[2] / 2;
      const oMaxZ = obs.pos[2] + obs.size[2] / 2;
      const oMaxY = obs.pos[1] + obs.size[1] / 2;

      const pMinX = pos.x - radius;
      const pMaxX = pos.x + radius;
      const pMinZ = pos.z - radius;
      const pMaxZ = pos.z + radius;

      const overlapX = Math.min(pMaxX, oMaxX) - Math.max(pMinX, oMinX);
      const overlapZ = Math.min(pMaxZ, oMaxZ) - Math.max(pMinZ, oMinZ);

      if (overlapX > 0 && overlapZ > 0) {
        if (oMaxY <= pos.y + 0.5) {
          if (oMaxY > highestGroundY) {
            highestGroundY = oMaxY;
          }
        }
      }
    }
    if (pos.y < highestGroundY + 0.05) {
      pos.y = highestGroundY;
    }
  };

  // On spawn, resolve overlaps
  useEffect(() => {
    resolvePlayerOverlap(position.current, 0.8, 1.8);
  }, []);

  // Dynamic grounding for transformed prop
  useLayoutEffect(() => {
    if (transformProp && propGroupRef.current && playerGroup.current) {
      const origPos = playerGroup.current.position.clone();
      const origRot = playerGroup.current.rotation.clone();

      playerGroup.current.position.set(0, 0, 0);
      playerGroup.current.rotation.set(0, 0, 0);

      const origPropY = propGroupRef.current.position.y;
      propGroupRef.current.position.y = 0;

      playerGroup.current.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(propGroupRef.current);
      const minY = box.min.y;

      playerGroup.current.position.copy(origPos);
      playerGroup.current.rotation.copy(origRot);
      playerGroup.current.updateMatrixWorld(true);

      setYOffset(-minY);
    } else {
      setYOffset(0);
    }
  }, [transformProp]);

  // KeyE interaction listener for transformation (tap-to-cycle, hold-to-revert)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "KeyE") {
        if (keyEPressedRef.current) return;
        keyEPressedRef.current = true;
        keyEStartTimeRef.current = performance.now();
        keyEHoldTriggeredRef.current = false;

        // Set hold timeout (600ms) to revert to human
        keyEHoldTimeoutRef.current = setTimeout(() => {
          keyEHoldTriggeredRef.current = true;
          setTransformProp((prev) => {
            if (prev) {
              scanTimer.current = 0.18; // Force immediate scan
              window.dispatchEvent(new CustomEvent('hud-update', { detail: { visible: false, text: "" } }));
              resolvePlayerOverlap(position.current, 0.8, 1.8);
              return null;
            }
            return prev;
          });
        }, 600);
      }
    };

    const applyTargetAlignment = (target) => {
      // Inherit rotation
      let targetRotY = null;
      if (Array.isArray(target.rot)) {
        targetRotY = target.rot[1];
      } else if (Array.isArray(target.rotation)) {
        targetRotY = target.rotation[1];
      } else if (typeof target.rotation === "number") {
        targetRotY = target.rotation;
      }

      let finalRotY;
      if (targetRotY !== null && targetRotY !== undefined) {
        // Source prop has rotation -> copy exact yaw
        finalRotY = targetRotY;
      } else {
        // Source prop has no stored rotation -> default to player yaw
        finalRotY = playerGroup.current ? playerGroup.current.rotation.y : 0;
      }

      setTransformProp({
        id: target.id,
        type: target.type,
        size: [...target.size],
        color: target.color,
        rotation: [0, finalRotY, 0]
      });

      if (playerGroup.current) {
        playerGroup.current.rotation.y = finalRotY;
      }

      // Resolve overlap using target's collision dimensions
      const [w, h, d] = target.size;
      const propRadius = Math.max(w, d) / 2;
      const radius = Math.max(0.35, Math.min(1.0, propRadius));
      const height = Math.max(0.7, Math.min(2.2, h));
      resolvePlayerOverlap(position.current, radius, height, target.id);
    };

    const handleKeyUp = (e) => {
      if (e.code === "KeyE") {
        keyEPressedRef.current = false;
        if (keyEHoldTimeoutRef.current) {
          clearTimeout(keyEHoldTimeoutRef.current);
          keyEHoldTimeoutRef.current = null;
        }

        // Only cycle on keyup if the hold timeout wasn't triggered
        if (!keyEHoldTriggeredRef.current) {
          const now = performance.now();
          if (now - lastTransformTime.current < 250) return;
          lastTransformTime.current = now;

          // Scan for candidates
          const candidates = [];
          for (const item of FURNITURE) {
            if (!isAllowedProp(item)) continue;

            const dx = item.pos[0] - position.current.x;
            const dz = item.pos[2] - position.current.z;
            const distXZ = Math.sqrt(dx * dx + dz * dz);

            if (distXZ < 3.5) {
              candidates.push({ item, dist: distXZ });
            }
          }

          if (candidates.length === 0) {
            if (transformProp) {
              setTransformProp(null);
              scanTimer.current = 0.18;
              window.dispatchEvent(new CustomEvent('hud-update', { detail: { visible: false, text: "" } }));
              resolvePlayerOverlap(position.current, 0.8, 1.8);
            }
            return;
          }

          // Find closest candidate
          let closestItem = candidates[0];
          for (const c of candidates) {
            if (c.dist < closestItem.dist) {
              closestItem = c;
            }
          }

          const nearCandidates = candidates.filter(
            (c) => c.dist < closestItem.dist + 0.5
          );
          const farCandidates = candidates.filter(
            (c) => c.dist >= closestItem.dist + 0.5
          );

          nearCandidates.sort((a, b) => {
            const pA = getPriorityWeight(a.item.type);
            const pB = getPriorityWeight(b.item.type);
            if (pA !== pB) return pA - pB;
            return a.dist - b.dist;
          });

          farCandidates.sort((a, b) => a.dist - b.dist);

          const sortedCandidates = [
            ...nearCandidates.map((c) => c.item),
            ...farCandidates.map((c) => c.item)
          ];

          if (!transformProp) {
            // Human -> Become selected prop immediately
            applyTargetAlignment(sortedCandidates[0]);
          } else {
            // Object -> cycle instantly to next candidate
            const currentIndex = sortedCandidates.findIndex((c) => c.id === transformProp.id);
            if (currentIndex === -1) {
              applyTargetAlignment(sortedCandidates[0]);
            } else {
              const nextIndex = currentIndex + 1;
              if (nextIndex < sortedCandidates.length) {
                applyTargetAlignment(sortedCandidates[nextIndex]);
              } else {
                // Wrap around -> human
                setTransformProp(null);
                scanTimer.current = 0.18;
                window.dispatchEvent(new CustomEvent('hud-update', { detail: { visible: false, text: "" } }));
                resolvePlayerOverlap(position.current, 0.8, 1.8);
              }
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [transformProp]);

  // AABB Collision Detection and Resolution
  const checkCollisions = (pos, vel, radius, height) => {
    let grounded = false;

    // Check world bounds first
    const limit = 98;
    if (pos.x < -limit) { pos.x = -limit; vel.x = 0; }
    if (pos.x > limit) { pos.x = limit; vel.x = 0; }
    if (pos.z < -limit) { pos.z = -limit; vel.z = 0; }
    if (pos.z > limit) { pos.z = limit; vel.z = 0; }

    for (const obs of OBSTACLES) {
      // Skip checking collision against the morphed prop itself to prevent getting stuck
      if (transformProp && obs.id === transformProp.id) {
        continue;
      }

      // Player AABB
      const pMinX = pos.x - radius;
      const pMaxX = pos.x + radius;
      const pMinZ = pos.z - radius;
      const pMaxZ = pos.z + radius;
      const pMinY = pos.y;
      const pMaxY = pos.y + height;

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

    // Floor collision (y = 0 is ground)
    if (pos.y <= 0) {
      pos.y = 0;
      vel.y = Math.max(0, vel.y);
      grounded = true;
    }

    return grounded;
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);

    const { forward, backward, left, right, jump } = keyboard.current;

    // Decrement landing damping timer
    if (landDampingTimer.current > 0) {
      landDampingTimer.current -= dt;
    }

    // Proximity scanning (throttled to 180ms, 360° XZ distance based)
    scanTimer.current += dt;
    if (scanTimer.current >= 0.18) {
      scanTimer.current = 0;

      const candidates = [];
      for (const item of FURNITURE) {
        if (!isAllowedProp(item)) continue;

        const dx = item.pos[0] - position.current.x;
        const dz = item.pos[2] - position.current.z;
        const distXZ = Math.sqrt(dx * dx + dz * dz);

        if (distXZ < 3.5) {
          candidates.push({ item, dist: distXZ });
        }
      }

      if (candidates.length > 0) {
        // Find closest candidate
        let closestItem = candidates[0];
        for (const c of candidates) {
          if (c.dist < closestItem.dist) {
            closestItem = c;
          }
        }

        // Distance dominates. Group objects within 0.5 units of the closest.
        const nearCandidates = candidates.filter(
          (c) => c.dist < closestItem.dist + 0.5
        );
        const farCandidates = candidates.filter(
          (c) => c.dist >= closestItem.dist + 0.5
        );

        nearCandidates.sort((a, b) => {
          const pA = getPriorityWeight(a.item.type);
          const pB = getPriorityWeight(b.item.type);
          if (pA !== pB) return pA - pB;
          return a.dist - b.dist;
        });

        farCandidates.sort((a, b) => a.dist - b.dist);

        const sorted = [
          ...nearCandidates.map((c) => c.item),
          ...farCandidates.map((c) => c.item)
        ];

        nearestPropRef.current = sorted[0];
      } else {
        nearestPropRef.current = null;
      }

      // Dispatch HUD overlay state updates outside Canvas
      if (!transformProp) {
        if (nearestPropRef.current) {
          const displayName = getPropDisplayName(nearestPropRef.current.type);
          window.dispatchEvent(new CustomEvent('hud-update', {
            detail: { visible: true, text: `[E] Become • ${displayName}` }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('hud-update', {
            detail: { visible: false, text: "" }
          }));
        }
      } else {
        const hasOtherProps = candidates.length > 1;
        if (hasOtherProps) {
          window.dispatchEvent(new CustomEvent('hud-update', {
            detail: { visible: true, text: "[E] Next Form  |  Hold [E] Human" }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('hud-update', {
            detail: { visible: true, text: "Hold [E] Human" }
          }));
        }
      }
    }

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

    // 2. Set target speed and interpolate current velocity (no movement penalties)
    let speedFactor = 1.0;
    
    // Lock player WASD movement during Placement Mode
    const targetSpeed = (keyboard.current.shift ? 10 : 4.5) * speedFactor;
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

    // Calculate collider bounds based on current form
    let currentRadius = 0.8;
    let currentHeight = 1.8;
    if (transformProp) {
      const [w, h, d] = transformProp.size;
      const propRadius = Math.max(w, d) / 2;
      currentRadius = Math.max(0.35, Math.min(1.0, propRadius));
      currentHeight = Math.max(0.7, Math.min(2.2, h));
    }

    // 3. Collision Resolution
    const isGrounded = checkCollisions(position.current, velocity.current, currentRadius, currentHeight);

    // 4. Handle Jump (object jump = human jump)
    if (isGrounded && jump) {
      velocity.current.y = 11;
    }

    // 5. Animate & Position Character Mesh
    if (playerGroup.current) {
      playerGroup.current.position.copy(position.current);

      if (transformProp) {
        // Keep morphed objects perfectly upright
        playerGroup.current.rotation.x = 0;
        playerGroup.current.rotation.z = 0;
      }

      // Smoothly rotate character toward movement direction
      if (moveDir.lengthSq() > 0.001) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetAngle - playerGroup.current.rotation.y;
        
        // Normalize angle to -PI to PI
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        
        playerGroup.current.rotation.y += diff * 12 * dt;
      }

      // 5.1 Calculate velocity-based animation state
      const time = state.clock.getElapsedTime();
      const lateralSpeed = Math.sqrt(
        velocity.current.x * velocity.current.x +
        velocity.current.z * velocity.current.z
      );

      let animState = "idle";
      if (lateralSpeed > 0.15 && moveDir.lengthSq() > 0.001) {
        animState = keyboard.current.shift ? "run" : "walk";
      }

      // Track transitions for Takeoff / Landing crouch juice & landing damping
      if (isGrounded && !wasGrounded.current) {
        landCrouchTime.current = 0.15; // landed crouch timer
        if (transformProp) {
          landDampingTimer.current = 0.25; // 250ms landing damping
        }
      }
      if (!isGrounded && wasGrounded.current && velocity.current.y > 0) {
        takeoffCrouchTime.current = 0.1; // takeoff crouch timer
      }
      wasGrounded.current = isGrounded;

      // Decrement crouch timers
      if (landCrouchTime.current > 0) landCrouchTime.current -= dt;
      if (takeoffCrouchTime.current > 0) takeoffCrouchTime.current -= dt;

      // Calculate takeoff/landing crouch offsets
      let crouchY = 0;
      let crouchKneeBend = 0;
      let crouchArmLift = 0;

      if (landCrouchTime.current > 0) {
        const progress = landCrouchTime.current / 0.15;
        const intensity = Math.sin(progress * Math.PI); // 0 -> 1 -> 0 curve
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

      // Animate human bones/meshes
      if (bodyMesh.current) {
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
          // Subtle breathing bob
          bobOffset = Math.sin(time * 2.5) * 0.02;
          // Subtle breathing tilt
          targetTorsoX = Math.sin(time * 2.5) * 0.01;
          // Slow head look around
          targetHeadY = Math.sin(time * 0.8) * 0.12;
          // Arm breathing sway
          targetLeftArmX = Math.sin(time * 2.5) * 0.03;
          targetRightArmX = -Math.sin(time * 2.5) * 0.03;
        } else if (animState === "walk") {
          const freq = 7.0;
          const legAmp = 0.35;
          const armAmp = 0.30;
          
          // Walking leg swing (opposite phases)
          targetLeftLegX = Math.sin(time * freq) * legAmp;
          targetRightLegX = -Math.sin(time * freq) * legAmp;

          // Walking arm swing (opposite to legs)
          targetLeftArmX = -Math.sin(time * freq) * armAmp;
          targetRightArmX = Math.sin(time * freq) * armAmp;

          // Torso bobbing (up and down twice per cycle)
          bobOffset = Math.abs(Math.sin(time * freq)) * 0.05 - 0.025;
          // Torso tilt and twist
          targetTorsoX = 0.04 + Math.sin(time * freq) * 0.01;
          targetTorsoY = Math.sin(time * freq) * 0.05;
          // Head counterbalance
          targetHeadY = -Math.sin(time * freq) * 0.02;
        } else if (animState === "run") {
          const freq = 11.0;
          const legAmp = 0.60;
          const armAmp = 0.55;

          // Running leg swing
          targetLeftLegX = Math.sin(time * freq) * legAmp;
          targetRightLegX = -Math.sin(time * freq) * legAmp;

          // Running arm swing
          targetLeftArmX = -Math.sin(time * freq) * armAmp;
          targetRightArmX = Math.sin(time * freq) * armAmp;

          // Torso bobbing
          bobOffset = Math.abs(Math.sin(time * freq)) * 0.09 - 0.045;
          // Torso forward lean & twist
          targetTorsoX = 0.12 + Math.sin(time * freq) * 0.02;
          targetTorsoY = Math.sin(time * freq) * 0.12;
          // Head counterbalance & look down slightly
          targetHeadX = -0.04;
          targetHeadY = -Math.sin(time * freq) * 0.03;
        }

        // Apply jump posture modifications (smoothly blend legs and arms to landing/jump positions)
        if (!isGrounded) {
          // Knees slightly tucked (bend backward)
          targetLeftLegX = -0.15;
          targetRightLegX = -0.15;

          // Arms relaxed (resting slightly forward)
          targetLeftArmX = 0.05;
          targetRightArmX = 0.05;

          // Keep body/torso upright and look straight
          targetTorsoX = 0;
          targetTorsoY = 0;
          targetHeadX = 0;
          targetHeadY = 0;
          
          // No walking bob in air
          bobOffset = 0;
        }

        // Combine takeoff/landing crouches
        bobOffset += crouchY;
        targetLeftLegX += crouchKneeBend;
        targetRightLegX += crouchKneeBend;
        targetLeftArmX += crouchArmLift;
        targetRightArmX += crouchArmLift;

        // Smoothly interpolate actual limb/bone rotations to targets
        const lerpSpeed = 10;
        
        bodyMesh.current.position.y = THREE.MathUtils.lerp(bodyMesh.current.position.y, bobOffset, lerpSpeed * dt);
        
        // Disable procedural body rotation of root - keep upright!
        bodyMesh.current.rotation.x = 0;
        bodyMesh.current.rotation.y = 0;
        bodyMesh.current.rotation.z = 0;

        // Apply rotation to torsoGroup instead
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

    // 6. Camera Follow System
    const theta = mouseRotation.current.x;
    const phi = mouseRotation.current.y;

    // Calculate directions
    const backDir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.sin(phi),
      Math.cos(theta) * Math.cos(phi)
    );

    const rightDir = new THREE.Vector3(
      Math.cos(theta),
      0,
      -Math.sin(theta)
    );

    // Pivot is at player head (height = 1.8)
    const pivotHeight = 1.8;
    const pivot = new THREE.Vector3(
      position.current.x,
      position.current.y + pivotHeight,
      position.current.z
    );

    const shoulderOffset = 0.7;
    const currentDistance = camDistance.current;

    // Ideal camera position before collisions
    const idealCamPos = new THREE.Vector3()
      .copy(pivot)
      .addScaledVector(backDir, currentDistance)
      .addScaledVector(rightDir, shoulderOffset);

    // Cast ray from pivot to idealCamPos
    const rayVec = new THREE.Vector3().subVectors(idealCamPos, pivot);
    const rayLen = rayVec.length();
    
    let minT = 1.0; // range 0 to 1

    if (rayLen > 0.001) {
      // Virtual ceiling and floor bounding boxes
      const cameraObstacles = [
        ...WALLS,
        { pos: [0, 5.9, 5], size: [60, 0.2, 50] }, // Ceiling
        { pos: [0, 0.1, 5], size: [60, 0.2, 50] }  // Floor
      ];

      for (const wall of cameraObstacles) {
        const t = checkWallCollision(pivot, rayVec, wall);
        if (t !== null && t < minT) {
          minT = t;
        }
      }
    }

    // Apply safety margin (e.g. 0.25 units) to prevent near plane clipping through wall
    const safetyMargin = 0.25;
    const finalDistance = Math.max(0.6, rayLen * minT - safetyMargin);

    const targetCamPos = new THREE.Vector3()
      .copy(pivot)
      .addScaledVector(rayVec.clone().normalize(), finalDistance);

    // Smoothly interpolate camera position
    camera.position.lerp(targetCamPos, 12 * dt);

    // Look-at target (slightly offset horizontally for shoulder framing)
    const targetLookAt = new THREE.Vector3()
      .copy(pivot)
      .addScaledVector(rightDir, shoulderOffset);

    // Smoothly interpolate the lookAt position to avoid camera jitters
    currentLookAt.current.lerp(targetLookAt, 12 * dt);
    camera.lookAt(currentLookAt.current);
  });

  return (
    <group ref={playerGroup}>
      {/* Visual representations of the player */}
      {transformProp ? (
        <group ref={propGroupRef} position={[0, yOffset, 0]} scale={transformScale}>
          <FurnitureItem
            type={transformProp.type}
            pos={[0, 0, 0]}
            size={transformProp.size}
            color={transformProp.color}
          />
        </group>
      ) : (
        <group ref={bodyMesh}>
          {/* Torso Group (Hoodie & T-Shirt) - Pivot at hips Y = 0.7 */}
          <group ref={torsoGroup} position={[0, 0.7, 0]}>
            {/* Torso Hoodie Main Block */}
            <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.6, 0.68, 0.36]} />
              <meshStandardMaterial color="#1d3557" roughness={0.85} /> {/* Muted Dark Blue Hoodie */}
            </mesh>
            
            {/* Hoodie Bottom Hem Trim */}
            <mesh position={[0, 0.03, 0]} castShadow>
              <boxGeometry args={[0.61, 0.06, 0.37]} />
              <meshStandardMaterial color="#1d3557" roughness={0.85} />
            </mesh>

            {/* Cream T-Shirt peeking out at bottom */}
            <mesh position={[0, -0.02, 0]} castShadow>
              <boxGeometry args={[0.57, 0.04, 0.34]} />
              <meshStandardMaterial color="#f5ebe0" roughness={0.9} /> {/* Cream T-Shirt */}
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
                <meshStandardMaterial color="#f5ebe0" roughness={0.7} /> {/* Skin */}
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

              {/* Hair (Short low-poly brown hair block on top) */}
              <mesh position={[0, 0.32, 0.01]} castShadow>
                <boxGeometry args={[0.34, 0.12, 0.34]} />
                <meshStandardMaterial color="#4a3728" roughness={0.9} /> {/* Brown Hair */}
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
            {/* Pants (Loose Brown Pants) */}
            <mesh position={[0, -0.275, 0]} castShadow>
              <boxGeometry args={[0.24, 0.55, 0.24]} />
              <meshStandardMaterial color="#8c7866" roughness={0.9} /> {/* Brown Loose Pants */}
            </mesh>
            {/* Sneaker (White Shoes) */}
            <mesh position={[0, -0.625, 0.03]} castShadow>
              <boxGeometry args={[0.24, 0.15, 0.32]} />
              <meshStandardMaterial color="#fafafa" roughness={0.8} /> {/* White Sneakers */}
            </mesh>
            {/* Sneaker Sole (Grey) */}
            <mesh position={[0, -0.71, 0.03]} castShadow>
              <boxGeometry args={[0.25, 0.04, 0.33]} />
              <meshStandardMaterial color="#a1a1aa" roughness={0.8} />
            </mesh>
          </group>

          {/* Right Leg Group - attached directly to bodyMesh at hips (Y = 0.7 absolute) */}
          <group ref={rightLeg} position={[0.18, 0.7, 0]}>
            {/* Pants (Loose Brown Pants) */}
            <mesh position={[0, -0.275, 0]} castShadow>
              <boxGeometry args={[0.24, 0.55, 0.24]} />
              <meshStandardMaterial color="#8c7866" roughness={0.9} />
            </mesh>
            {/* Sneaker (White Shoes) */}
            <mesh position={[0, -0.625, 0.03]} castShadow>
              <boxGeometry args={[0.24, 0.15, 0.32]} />
              <meshStandardMaterial color="#fafafa" roughness={0.8} />
            </mesh>
            {/* Sneaker Sole (Grey) */}
            <mesh position={[0, -0.71, 0.03]} castShadow>
              <boxGeometry args={[0.25, 0.04, 0.33]} />
              <meshStandardMaterial color="#a1a1aa" roughness={0.8} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
}
