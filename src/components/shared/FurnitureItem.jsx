import React from "react";
import * as THREE from "three";

// Sofa / Armchair
export function Sofa({ pos, size, color }) {
  const [w, h, d] = size;
  const seatHeight = h * 0.5;
  const backHeight = h * 0.9;
  const armThickness = 0.35;
  const backThickness = 0.35;

  const isWide = w >= d;

  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, -h/4 + 0.05, 0]}>
        <boxGeometry args={[w - 0.05, seatHeight, d - 0.05]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      
      {isWide ? (
        <mesh castShadow receiveShadow position={[0, h/2 - backHeight/2 + 0.05, -d/2 + backThickness/2]}>
          <boxGeometry args={[w - 0.05, backHeight, backThickness]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow position={[-w/2 + backThickness/2, h/2 - backHeight/2 + 0.05, 0]}>
          <boxGeometry args={[backThickness, backHeight, d - 0.05]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      )}

      {isWide ? (
        <>
          <mesh castShadow receiveShadow position={[-w/2 + armThickness/2, 0.1, 0]}>
            <boxGeometry args={[armThickness, h * 0.7, d]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh castShadow receiveShadow position={[w/2 - armThickness/2, 0.1, 0]}>
            <boxGeometry args={[armThickness, h * 0.7, d]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        </>
      ) : (
        <>
          <mesh castShadow receiveShadow position={[0, 0.1, -d/2 + armThickness/2]}>
            <boxGeometry args={[w, h * 0.7, armThickness]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.1, d/2 - armThickness/2]}>
            <boxGeometry args={[w, h * 0.7, armThickness]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        </>
      )}

      {[
        [-w/2 + 0.2, -d/2 + 0.2],
        [w/2 - 0.2, -d/2 + 0.2],
        [-w/2 + 0.2, d/2 - 0.2],
        [w/2 - 0.2, d/2 - 0.2]
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, -h/2 + 0.05, lz]} castShadow>
          <cylinderGeometry args={[0.06, 0.04, 0.15, 8]} />
          <meshStandardMaterial color="#2d1a10" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Cushion
export function Cushion({ pos, size, color }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

// Tables & Desks
export function Table({ pos, size, color }) {
  const [w, h, d] = size;
  const topThickness = 0.08;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, h/2 - topThickness/2, 0]}>
        <boxGeometry args={[w, topThickness, d]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
      </mesh>
      {[
        [-w/2 + 0.12, -d/2 + 0.12],
        [w/2 - 0.12, -d/2 + 0.12],
        [-w/2 + 0.12, d/2 - 0.12],
        [w/2 - 0.12, d/2 - 0.12],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, -topThickness/2, z]}>
          <cylinderGeometry args={[0.04, 0.03, h - topThickness]} />
          <meshStandardMaterial color="#3e2723" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Bookshelf
export function Bookshelf({ pos, size, color }) {
  const [w, h, d] = size;
  const thickness = 0.08;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, 0, -d/2 + thickness/2]}>
        <boxGeometry args={[w, h, thickness]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[-w/2 + thickness/2, 0, 0]}>
        <boxGeometry args={[thickness, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[w/2 - thickness/2, 0, 0]}>
        <boxGeometry args={[thickness, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, h/2 - thickness/2, 0]}>
        <boxGeometry args={[w, thickness, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, -h/2 + thickness/2, 0]}>
        <boxGeometry args={[w, thickness, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      
      {[-h/4, 0, h/4].map((yOffset, shelfIndex) => (
        <group key={shelfIndex} position={[0, yOffset, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[w - 0.08, 0.06, d - 0.08]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          {[-0.3, -0.1, 0.1, 0.3].map((xOffset, bookIndex) => {
            const colors = ["#b91c1c", "#1d4ed8", "#047857", "#b45309", "#4f46e5"];
            const bookColor = colors[(shelfIndex * 4 + bookIndex) % colors.length];
            const height = 0.4 + Math.abs(Math.sin(xOffset * 10)) * 0.15;
            return (
              <mesh key={bookIndex} castShadow position={[xOffset, height/2 + 0.04, 0]}>
                <boxGeometry args={[0.12, height, d - 0.2]} />
                <meshStandardMaterial color={bookColor} roughness={0.7} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// Plant
export function Plant({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, -h/4, 0]}>
        <cylinderGeometry args={[w/2, w/3, h/2, 12]} />
        <meshStandardMaterial color="#b45309" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.05, 0.05, h/2, 8]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, h/4 + 0.1, 0]}>
        <sphereGeometry args={[w/1.8, 12, 12]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.25, h/3 + 0.2, 0.15]}>
        <sphereGeometry args={[w/2.4, 12, 12]} />
        <meshStandardMaterial color="#14532d" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[-0.2, h/3 + 0.15, -0.2]}>
        <sphereGeometry args={[w/2.6, 12, 12]} />
        <meshStandardMaterial color="#065f46" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Floor Lamp
export function Lamp({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow position={[0, -h/2 + 0.03, 0]}>
        <cylinderGeometry args={[w/2, w/2, 0.06, 16]} />
        <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, h - 0.1, 8]} />
        <meshStandardMaterial color="#d97706" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, h/2 - 0.2, 0]}>
        <cylinderGeometry args={[w/2, w/1.5, 0.4, 16]} />
        <meshStandardMaterial color="#fef08a" roughness={0.7} />
      </mesh>
      <pointLight position={[0, h/2 - 0.2, 0]} color={color} intensity={1.8} distance={15} castShadow />
    </group>
  );
}

// Kitchen Island
export function KitchenIsland({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[w - 0.1, h - 0.1, d - 0.1]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, h/2 - 0.05, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#fafafa" roughness={0.2} metalness={0.1} />
      </mesh>
    </group>
  );
}

// Kitchen Counter
export function Counter({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[w - 0.05, h - 0.1, d - 0.05]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, h/2 - 0.05, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#f4f4f5" roughness={0.3} />
      </mesh>
      {w > 10 && (
        <group position={[0, h/2, 0.2]}>
          <mesh castShadow>
            <boxGeometry args={[2.0, 0.02, 1.0]} />
            <meshStandardMaterial color="#a1a1aa" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh castShadow position={[0, 0.3, -0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// Retro Refrigerator
export function Refrigerator({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[w/2 - 0.08, 0.2, d/2 + 0.05]}>
        <boxGeometry args={[0.06, h * 0.4, 0.06]} />
        <meshStandardMaterial color="#f4f4f5" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, h/3, d/2 + 0.01]}>
        <boxGeometry args={[0.5, 0.08, 0.01]} />
        <meshStandardMaterial color="#f4f4f5" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.3, d/2 + 0.005]}>
        <boxGeometry args={[w - 0.02, 0.015, 0.01]} />
        <meshBasicMaterial color="#3f3f46" />
      </mesh>
    </group>
  );
}

// Cozy Bed
export function Bed({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, -h/4, 0]}>
        <boxGeometry args={[w, h/2, d]} />
        <meshStandardMaterial color="#5c4033" roughness={0.8} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.1, 0.1]}>
        <boxGeometry args={[w - 0.2, h/2, d - 0.4]} />
        <meshStandardMaterial color="#fdfdfd" roughness={0.95} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.14, 1.0]}>
        <boxGeometry args={[w - 0.18, h/2 + 0.04, d - 2.5]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {[-1, 1].map((dir, i) => (
        <mesh key={i} castShadow position={[dir * (w / 4.5), h/2 + 0.08, -d/2 + 0.8]}>
          <boxGeometry args={[w/2.8, 0.2, 1.2]} />
          <meshStandardMaterial color="#eeeeee" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Wardrobe / Closet
export function Wardrobe({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[w/2 + 0.01, 0, 0]}>
        <boxGeometry args={[0.005, h - 0.2, 0.015]} />
        <meshBasicMaterial color="#371e11" />
      </mesh>
      <mesh position={[w/2 + 0.03, 0.1, -0.15]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[w/2 + 0.03, 0.1, 0.15]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// TV Cabinet/Credenza
export function TVStand({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, d/2 + 0.01]}>
        <boxGeometry args={[w - 0.4, h - 0.2, 0.01]} />
        <meshBasicMaterial color="#18181b" />
      </mesh>
      <mesh position={[0, 0, d/2]}>
        <boxGeometry args={[w - 0.4, 0.05, d - 0.1]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  );
}

// TV Screen
export function TVScreen({ pos, size, color }) {
  const [w, h, d] = size;
  const standHeight = 0.6;
  const screenHeight = h - standHeight;
  
  return (
    <group position={pos}>
      {/* Screen */}
      <mesh castShadow position={[0, standHeight/2, 0]}>
        <boxGeometry args={[w, screenHeight, d]} />
        <meshStandardMaterial color="#18181b" roughness={0.5} />
      </mesh>
      {/* Glossy Display panel facing front (negative Z) */}
      <mesh position={[0, standHeight/2, -d/2 - 0.005]}>
        <boxGeometry args={[w - 0.1, screenHeight - 0.1, 0.01]} />
        <meshStandardMaterial color="#09090b" roughness={0.15} metalness={0.9} />
      </mesh>
      {/* Stand Pole */}
      <mesh castShadow position={[0, -h/2 + 0.32, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.56, 8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Stand Base Plate */}
      <mesh castShadow position={[0, -h/2 + 0.02, 0]}>
        <boxGeometry args={[0.8, 0.04, 0.5]} />
        <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Trash Bin
export function TrashBin({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[w/2, w/2.2, h, 12]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, h/2, 0]}>
        <cylinderGeometry args={[w/1.8, w/1.8, 0.1, 12]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.4} />
      </mesh>
    </group>
  );
}

// Microwave
export function Microwave({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[-w*0.15, 0, d/2 + 0.01]}>
        <boxGeometry args={[w * 0.55, h * 0.7, 0.02]} />
        <meshStandardMaterial color="#18181b" roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[w*0.3, 0, d/2 + 0.01]}>
        <boxGeometry args={[w * 0.25, h * 0.7, 0.02]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Toaster
export function Toaster({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[w/2 + 0.05, 0, 0]}>
        <boxGeometry args={[0.1, 0.1, 0.2]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Blender
export function Blender({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow position={[0, -h/4, 0]}>
        <cylinderGeometry args={[w/2.2, w/2, h/2, 12]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, h/4, 0]}>
        <cylinderGeometry args={[w/2.5, w/3, h/2, 12]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.5} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh castShadow position={[0, h/2 - 0.05, 0]}>
        <cylinderGeometry args={[w/2.4, w/2.4, 0.1, 12]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Coffee Maker
export function CoffeeMaker({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow position={[0, -h/2 + 0.05, 0]}>
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-w/3, 0, 0]}>
        <boxGeometry args={[w/3, h - 0.1, d * 0.8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[w/8, -0.05, 0]}>
        <cylinderGeometry args={[w/3.5, w/3.5, h * 0.6, 12]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.6} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh castShadow position={[0, h/2 - 0.1, 0]}>
        <boxGeometry args={[w, 0.2, d]} />
        <meshStandardMaterial color="#27272a" roughness={0.6} />
      </mesh>
    </group>
  );
}

// Chair
export function Chair({ pos, size, color }) {
  const [w, h, d] = size;
  const seatHeight = h * 0.5;
  const backHeight = h * 0.5;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[w, 0.08, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, backHeight/2, -d/2 + 0.04]}>
        <boxGeometry args={[w, backHeight, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {[
        [-w/2 + 0.08, -d/2 + 0.08],
        [w/2 - 0.08, -d/2 + 0.08],
        [-w/2 + 0.08, d/2 - 0.08],
        [w/2 - 0.08, d/2 - 0.08]
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, -seatHeight/2, z]}>
          <cylinderGeometry args={[0.03, 0.03, seatHeight, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Desk Lamp
export function DeskLamp({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow position={[0, -h/2 + 0.02, 0]}>
        <cylinderGeometry args={[w/2, w/2, 0.04, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[-w/6, 0, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.03, 0.03, h - 0.1, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[w/6, h/2 - 0.15, 0]} rotation={[0, 0, -0.6]}>
        <coneGeometry args={[w/2, 0.3, 12]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>
      <pointLight position={[w/6, h/2 - 0.25, 0]} color={color} intensity={1.8} distance={7} castShadow />
    </group>
  );
}

// Laundry Basket
export function LaundryBasket({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[w/2, w/2.3, h - 0.1, 16]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, h/2 - 0.05, 0]}>
        <cylinderGeometry args={[w/1.9, w/1.9, 0.1, 16]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Fruit Bowl
export function FruitBowl({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[w/2, w/3, h, 12]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[-w/5, h/2, -d/6]}>
        <sphereGeometry args={[w/4, 8, 8]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[w/5, h/2, d/6]}>
        <sphereGeometry args={[w/3.8, 8, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, h/2 + 0.05, -d/5]}>
        <sphereGeometry args={[w/4.2, 8, 8]} />
        <meshStandardMaterial color="#eab308" roughness={0.6} />
      </mesh>
    </group>
  );
}

// Mug
export function Mug({ pos, size, color }) {
  const [w, h, d] = size;
  return (
    <group position={pos}>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[w/2, w/2, h, 12]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[w/2.4, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[h/3.5, 0.05, 8, 24]} />
        <meshStandardMaterial color={color} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Cardboard Box
export function CardboardBox({ pos, size, color }) {
  const [w, h, d] = size;
  const boxColor = color || "#c6a07c";
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={boxColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, h/2 + 0.002, 0]}>
        <boxGeometry args={[w - 0.02, 0.005, 0.04]} />
        <meshStandardMaterial color="#8e6a4e" roughness={0.9} />
      </mesh>
      <mesh position={[0, h/2 + 0.003, 0]}>
        <boxGeometry args={[0.04, 0.005, d - 0.02]} />
        <meshStandardMaterial color="#8e6a4e" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Wooden Crate
export function WoodenCrate({ pos, size, color }) {
  const [w, h, d] = size;
  const crateColor = color || "#b58f6d";
  return (
    <group position={pos}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w - 0.06, h - 0.06, d - 0.06]} />
        <meshStandardMaterial color={crateColor} roughness={0.8} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, h/2 - 0.03, 0]}>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color="#8c6239" roughness={0.8} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -h/2 + 0.03, 0]}>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color="#8c6239" roughness={0.8} />
      </mesh>
      {[-1, 1].map((x) =>
        [-1, 1].map((z) => (
          <mesh key={`${x}-${z}`} castShadow position={[x * (w/2 - 0.03), 0, z * (d/2 - 0.03)]}>
            <boxGeometry args={[0.06, h - 0.12, 0.06]} />
            <meshStandardMaterial color="#8c6239" roughness={0.8} />
          </mesh>
        ))
      )}
      <mesh position={[0, 0, d/2 - 0.015]} rotation={[0, 0, Math.atan2(h, w)]}>
        <boxGeometry args={[Math.sqrt(w*w + h*h) - 0.1, 0.04, 0.03]} />
        <meshStandardMaterial color="#6e4720" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0, -d/2 + 0.015]} rotation={[0, 0, -Math.atan2(h, w)]}>
        <boxGeometry args={[Math.sqrt(w*w + h*h) - 0.1, 0.04, 0.03]} />
        <meshStandardMaterial color="#6e4720" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Stack of Books
export function BookStack({ pos, size, color }) {
  const [w, h, d] = size;
  const bookColors = ["#b91c1c", "#1d4ed8", "#047857", "#b45309", "#4f46e5", "#db2777"];
  const numBooks = 4;
  const bookHeight = h / numBooks;
  return (
    <group position={pos}>
      {Array.from({ length: numBooks }).map((_, i) => {
        const seed = Math.sin(pos[0] * 12.9898 + pos[2] * 78.233 + i * 23.3) * 43758.5453;
        const rotY = (seed - Math.floor(seed) - 0.5) * 0.4;
        const offsetX = (Math.cos(seed) - 0.5) * 0.03;
        const offsetZ = (Math.sin(seed) - 0.5) * 0.03;
        const bookColor = bookColors[Math.abs(Math.floor(seed * 10)) % bookColors.length];
        return (
          <mesh
            key={i}
            castShadow
            position={[offsetX, -h/2 + bookHeight/2 + i * bookHeight, offsetZ]}
            rotation={[0, rotY, 0]}
          >
            <boxGeometry args={[w - 0.05 * (i % 2), bookHeight - 0.01, d - 0.05 * (i % 2)]} />
            <meshStandardMaterial color={bookColor} roughness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

// Route to correct furniture component
// Route to correct furniture component
export function FurnitureItem({ type, pos, size, color, rotation, childrenProps }) {
  const rotationEuler = rotation ? (Array.isArray(rotation) ? rotation : [0, rotation, 0]) : [0, 0, 0];

  const renderItem = () => {
    switch (type) {
      case "chair":
        return <Chair pos={[0, 0, 0]} size={size} color={color} />;
      case "cardboard_box":
        return <CardboardBox pos={[0, 0, 0]} size={size} color={color} />;
      case "wooden_crate":
        return <WoodenCrate pos={[0, 0, 0]} size={size} color={color} />;
      case "book_stack":
        return <BookStack pos={[0, 0, 0]} size={size} color={color} />;
      case "sofa_main":
      case "sofa_single":
      case "sofa_l":
        return <Sofa pos={[0, 0, 0]} size={size} color={color} />;
      case "coffee_table":
      case "table":
      case "desk":
      case "side_table":
      case "nightstand":
      case "bed_bench":
        return <Table pos={[0, 0, 0]} size={size} color={color} />;
      case "bookshelf":
        return <Bookshelf pos={[0, 0, 0]} size={size} color={color} />;
      case "plant":
        return <Plant pos={[0, 0, 0]} size={size} color={color} />;
      case "lamp":
        return <Lamp pos={[0, 0, 0]} size={size} color={color} />;
      case "kitchen_island":
        return <KitchenIsland pos={[0, 0, 0]} size={size} color={color} />;
      case "counter":
        return <Counter pos={[0, 0, 0]} size={size} color={color} />;
      case "fridge":
        return <Refrigerator pos={[0, 0, 0]} size={size} color={color} />;
      case "wardrobe":
        return <Wardrobe pos={[0, 0, 0]} size={size} color={color} />;
      case "bed":
        return <Bed pos={[0, 0, 0]} size={size} color={color} />;
      case "tv_stand":
        return <TVStand pos={[0, 0, 0]} size={size} color={color} />;
      case "tv_screen":
        return <TVScreen pos={[0, 0, 0]} size={size} color={color} />;
      case "cushion":
        return <Cushion pos={[0, 0, 0]} size={size} color={color} />;
      case "trash_bin":
        return <TrashBin pos={[0, 0, 0]} size={size} color={color} />;
      case "microwave":
        return <Microwave pos={[0, 0, 0]} size={size} color={color} />;
      case "coffee_maker":
        return <CoffeeMaker pos={[0, 0, 0]} size={size} color={color} />;
      case "toaster":
        return <Toaster pos={[0, 0, 0]} size={size} color={color} />;
      case "blender":
        return <Blender pos={[0, 0, 0]} size={size} color={color} />;
      case "fruit_bowl":
        return <FruitBowl pos={[0, 0, 0]} size={size} color={color} />;
      case "mug":
        return <Mug pos={[0, 0, 0]} size={size} color={color} />;
      case "desk_lamp":
        return <DeskLamp pos={[0, 0, 0]} size={size} color={color} />;
      case "laundry_basket":
        return <LaundryBasket pos={[0, 0, 0]} size={size} color={color} />;
      default:
        return (
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
    }
  };

  return (
    <group position={pos} rotation={rotationEuler}>
      {renderItem()}
      {childrenProps && childrenProps.map((child) => (
        <FurnitureItem
          key={child.id}
          type={child.type}
          pos={child.localPos || [0, 0, 0]}
          size={child.size}
          color={child.color}
          rotation={child.localRot || [0, 0, 0]}
        />
      ))}
    </group>
  );
}
