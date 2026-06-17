import React from "react";
import { Grid } from "@react-three/drei";

// Define the static obstacles in our world so they can be rendered and collision-checked
export const OBSTACLES = [
  { id: 1, pos: [-15, 3, -15], size: [4, 6, 4], color: "#8b5cf6" },
  { id: 2, pos: [15, 4, 15], size: [6, 8, 6], color: "#ec4899" },
  { id: 3, pos: [-25, 2, 20], size: [8, 4, 8], color: "#3b82f6" },
  { id: 4, pos: [20, 5, -20], size: [4, 10, 4], color: "#10b981" },
  { id: 5, pos: [0, 1, -35], size: [25, 2, 4], color: "#f59e0b" },
  { id: 6, pos: [-35, 6, -5], size: [6, 12, 6], color: "#8b5cf6" },
  { id: 7, pos: [35, 3, 5], size: [4, 6, 4], color: "#ec4899" },
  { id: 8, pos: [-5, 8, 40], size: [8, 16, 8], color: "#3b82f6" },
  { id: 9, pos: [40, 5, -45], size: [10, 10, 10], color: "#10b981" },
  { id: 10, pos: [-45, 4, -45], size: [8, 8, 8], color: "#f59e0b" },
];

export default function Arena() {
  return (
    <>
      {/* Soft general ambient light */}
      <ambientLight intensity={0.15} />

      {/* Main direction light (Sun/Moon-like) casting soft shadows */}
      <directionalLight
        position={[40, 60, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={150}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0001}
      />

      {/* Soft secondary light coming from the opposite side */}
      <directionalLight position={[-40, 30, -30]} intensity={0.4} color="#8b5cf6" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#08080c" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Cyberpunk Grid */}
      <Grid
        position={[0, 0.02, 0]}
        args={[1000, 1000]}
        cellSize={2}
        cellThickness={1.2}
        cellColor="#1e1b4b"
        sectionSize={10}
        sectionThickness={1.8}
        sectionColor="#6d28d9"
        fadeDistance={120}
        infiniteGrid
      />

      {/* Obstacles */}
      <group>
        {OBSTACLES.map((item) => (
          <mesh key={item.id} position={item.pos} castShadow receiveShadow>
            <boxGeometry args={item.size} />
            <meshStandardMaterial
              color="#0e0e17"
              roughness={0.2}
              metalness={0.8}
              emissive={item.color}
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
