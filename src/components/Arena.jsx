import React from "react";
import * as THREE from "three";
import { WALLS, FURNITURE, DECORATIONS } from "../data/mapData";

// --- WALL COMPONENT ---
function Wall({ pos, size, color }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

// --- FURNITURE COMPONENTS ---
import { FurnitureItem } from "./shared/FurnitureItem";

// --- DECORATIVE ELEMENTS (RUGS, SUNBEAMS, COURTYARD) ---

function Rug({ pos, size, color }) {
  return (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size[0], size[2]]} />
      <meshStandardMaterial color={color} roughness={1.0} />
    </mesh>
  );
}

function CourtyardTree({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      {/* Trunk */}
      <mesh position={[0, h * 0.25 - h/2, 0]} castShadow>
        <cylinderGeometry args={[w * 0.15, w * 0.2, h/2, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      {/* Foliage (Stylized) */}
      <mesh position={[0, h * 0.75 - h/2, 0]} castShadow>
        <dodecahedronGeometry args={[h/3.5]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0.2, h * 0.9 - h/2, 0.1]} castShadow>
        <dodecahedronGeometry args={[h/5]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  );
}

function WindowFrame({ pos, size }) {
  const [w, h, d] = size;
  const isXAligned = w > d;

  return (
    <group position={pos}>
      {/* Outer frame */}
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      {/* Glass Pane */}
      <mesh>
        <boxGeometry args={isXAligned ? [w - 0.2, h - 0.2, 0.05] : [0.05, h - 0.2, d - 0.2]} />
        <meshPhysicalMaterial
          color="#bae6fd"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.9}
          transmission={0.6}
          thickness={0.1}
        />
      </mesh>
      {/* Window Cross Grid */}
      <mesh>
        <boxGeometry args={isXAligned ? [w - 0.2, 0.06, 0.06] : [0.06, 0.06, d - 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh>
        <boxGeometry args={isXAligned ? [0.06, h - 0.2, 0.06] : [0.06, h - 0.2, 0.06]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Volumetric Sunbeam Effect (Fake Daylight)
function Sunbeam({ pos, rot, size }) {
  return (
    <mesh position={pos} rotation={new THREE.Euler().fromArray(rot)}>
      <boxGeometry args={size} />
      <meshBasicMaterial
        color="#fef08a"
        transparent
        opacity={0.07}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Poster({ pos, size, color }) {
  const [w, h, d] = size;
  const isXAligned = w > d;
  return (
    <group position={pos}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#2d2a29" roughness={0.9} />
      </mesh>
      {/* Artwork */}
      {isXAligned ? (
        <mesh position={[0, 0, d/2 + 0.01]}>
          <planeGeometry args={[w - 0.2, h - 0.2]} />
          <meshStandardMaterial color={color} roughness={1.0} />
        </mesh>
      ) : (
        <mesh position={[w/2 + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[d - 0.2, h - 0.2]} />
          <meshStandardMaterial color={color} roughness={1.0} />
        </mesh>
      )}
    </group>
  );
}

export default function Arena() {
  return (
    <>
      {/* Soft warm global ambient light - cozy and bright */}
      <ambientLight intensity={0.65} color="#fffbeb" />

      {/* Main warm sunlight casting soft shadows */}
      <directionalLight
        position={[25, 45, -20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0002}
      />

      {/* Soft skylight to fill shadow areas with a gentle blue-sky tone */}
      <hemisphereLight skyColor="#b4c8d8" groundColor="#c2a688" intensity={0.4} />

      {/* --- SEPARATE FLOORS (No Black Floors) --- */}
      {/* Hallway / Living Room Floor (Warm Oak Wood) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 15]} receiveShadow>
        <planeGeometry args={[50, 20]} />
        <meshStandardMaterial color="#b58a6f" roughness={0.65} metalness={0.05} />
      </mesh>

      {/* Kitchen Floor (Warm Terracotta Tiles) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-15, -0.01, -5]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#ca8a04" roughness={0.75} metalness={0.05} />
      </mesh>

      {/* Bedroom Floor (Light Birch Wood) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, -0.01, -5]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#dfc2a5" roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Connecting Room Floor (Warm Oak Wood to replace Courtyard) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -5]} receiveShadow>
        <planeGeometry args={[10, 20]} />
        <meshStandardMaterial color="#b58a6f" roughness={0.65} metalness={0.05} />
      </mesh>

      {/* --- RENDER WALLS --- */}
      <group>
        {WALLS.map((wall) => (
          <Wall key={wall.id} pos={wall.pos} size={wall.size} color={wall.color} />
        ))}
      </group>

      {/* --- RENDER FURNITURE --- */}
      <group>
        {FURNITURE.map((item) => (
          <FurnitureItem
            key={item.id}
            type={item.type}
            pos={item.pos}
            size={item.size}
            color={item.color}
            rotation={item.rotation}
          />
        ))}
      </group>

      {/* --- RENDER DECORATIONS & EFFECTS --- */}
      <group>
        {DECORATIONS.map((dec) => {
          if (dec.type === "rug") {
            return <Rug key={dec.id} pos={dec.pos} size={dec.size} color={dec.color} />;
          }
          if (dec.type === "grass") {
            return <mesh key={dec.id} rotation={[-Math.PI / 2, 0, 0]} position={dec.pos} receiveShadow>
              <planeGeometry args={[dec.size[0], dec.size[2]]} />
              <meshStandardMaterial color={dec.color} roughness={1.0} />
            </mesh>;
          }
          if (dec.type === "tree") {
            return <CourtyardTree key={dec.id} pos={dec.pos} size={dec.size} color={dec.color} />;
          }
          if (dec.type.startsWith("window")) {
            return <WindowFrame key={dec.id} pos={dec.pos} size={dec.size} />;
          }
          if (dec.type === "sunbeam") {
            return <Sunbeam key={dec.id} pos={dec.pos} rot={dec.rot} size={dec.size} />;
          }
          if (dec.type.startsWith("poster")) {
            return <Poster key={dec.id} pos={dec.pos} size={dec.size} color={dec.color} />;
          }
          return null;
        })}
      </group>
    </>
  );
}
