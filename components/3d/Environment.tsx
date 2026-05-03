'use client';

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { RigidBody, CuboidCollider, CylinderCollider, ConeCollider } from '@react-three/rapier';
import { Stars } from '@react-three/drei';

// Neon Cyberpunk / Synthwave Arena
export function Environment() {
  const gridTexture = useMemo(() => createGridTexture(), []);
  
  const sunShaderArgs = useMemo(() => ({
    uniforms: {
      color1: { value: new THREE.Color('#ffff00') }, // Yellow at bottom
      color2: { value: new THREE.Color('#ff0033') }, // Red at top
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color1;
      uniform vec3 color2;
      varying vec2 vUv;
      void main() {
        vec3 color = mix(color1, color2, vUv.y);
        
        if (vUv.y < 0.5) {
            float lineCoord = fract(vUv.y * 20.0);
            float gapSize = mix(0.7, 0.05, vUv.y * 2.0); 
            if (lineCoord < gapSize) discard;
        }

        gl_FragColor = vec4(color, 1.0);
      }
    `
  }), []);

  return (
    <>
      <color attach="background" args={['#801594']} />
      <fog attach="fog" args={['#d128d9', 30, 180]} />
      
      <Stars radius={150} depth={50} count={6000} factor={7} saturation={0} fade speed={1} />
      
      <ambientLight intensity={0.5} color="#5500aa" />
      <directionalLight position={[0, -10, -100]} intensity={1} color="#ff0055" />

      {/* Sun */}
      <mesh position={[0, 20, -150]}>
        <circleGeometry args={[70, 64]} />
        <shaderMaterial attach="material" args={[sunShaderArgs]} side={THREE.DoubleSide} transparent />
      </mesh>

      {/* Mountains Left */}
      <SynthMountain position={[-65, -2, -100]} scale={[30, 40, 30]} color="#00ff88" rotationY={Math.PI / 4} />
      <SynthMountain position={[-50, -2, -80]} scale={[20, 25, 20]} color="#0088ff" rotationY={Math.PI / 6} />
      <SynthMountain position={[-85, -2, -120]} scale={[40, 60, 40]} color="#ff00ff" rotationY={Math.PI / 3} />
      <SynthMountain position={[-110, -2, -90]} scale={[35, 45, 35]} color="#ffff00" rotationY={Math.PI / 5} />
      <SynthMountain position={[-32, -2, -50]} scale={[15, 20, 15]} color="#ff0055" rotationY={Math.PI / 4} />

      {/* Mountains Right */}
      <SynthMountain position={[65, -2, -100]} scale={[35, 50, 35]} color="#00ff88" rotationY={Math.PI / 4} />
      <SynthMountain position={[55, -2, -80]} scale={[25, 30, 25]} color="#0088ff" rotationY={Math.PI / 6} />
      <SynthMountain position={[85, -2, -120]} scale={[45, 65, 45]} color="#ff00ff" rotationY={Math.PI / 3} />
      <SynthMountain position={[120, -2, -90]} scale={[30, 40, 30]} color="#ffff00" rotationY={Math.PI / 5} />
      <SynthMountain position={[36, -2, -60]} scale={[18, 25, 18]} color="#ff0055" rotationY={Math.PI / 4} />

      {/* Mountains Behind (Sides) */}
      <SynthMountain position={[-90, -2, 120]} scale={[35, 55, 35]} color="#00ff88" />
      <SynthMountain position={[100, -2, 100]} scale={[45, 65, 45]} color="#ff00ff" />
      <SynthMountain position={[-140, -2, 80]} scale={[25, 40, 25]} color="#0088ff" />
      <SynthMountain position={[120, -2, 140]} scale={[40, 60, 40]} color="#ffff00" />
      <SynthMountain position={[-70, -2, 40]} scale={[25, 35, 25]} color="#ff0055" />
      <SynthMountain position={[80, -2, 50]} scale={[30, 40, 30]} color="#00ff88" />

      {/* Clouds */}
      <SynthCloud position={[-80, 60, -160]} scale={4} color="#ff00ff" />
      <SynthCloud position={[90, 65, -170]} scale={5} color="#00ff88" />
      <SynthCloud position={[-50, 75, -190]} scale={3.5} color="#ff0033" />
      <SynthCloud position={[60, 70, -140]} scale={4.5} color="#ffff00" />
      <SynthCloud position={[-120, 80, -130]} scale={6} color="#0088ff" />
      <SynthCloud position={[130, 85, -140]} scale={4.8} color="#ff00ff" />

      {/* Cyberpunk City Background */}
      <SynthCity />

      {/* Palm Trees */}
      <PalmTree position={[-28, -1, -5]} scale={1.5} color="#ff00ff" />
      <PalmTree position={[-45, -1, -25]} scale={1.8} color="#00ff88" />
      <PalmTree position={[-22, -1, -55]} scale={1.2} color="#00ff88" />
      <PalmTree position={[-55, -1, -75]} scale={1.6} color="#ff00ff" />
      <PalmTree position={[-30, -1, -105]} scale={1.4} color="#ff00ff" />
      <PalmTree position={[-60, -1, -135]} scale={1.7} color="#ff00ff" />
      <PalmTree position={[-25, -1, -165]} scale={1.3} color="#00ff88" />

      <PalmTree position={[30, -1, -15]} scale={1.4} color="#00ff88" />
      <PalmTree position={[50, -1, -30]} scale={1.6} color="#ff00ff" />
      <PalmTree position={[25, -1, -65]} scale={1.5} color="#00ff88" />
      <PalmTree position={[45, -1, -85]} scale={1.8} color="#ff00ff" />
      <PalmTree position={[35, -1, -115]} scale={1.2} color="#00ff88" />
      <PalmTree position={[65, -1, -140]} scale={1.9} color="#ff00ff" />
      <PalmTree position={[32, -1, -170]} scale={1.5} color="#00ff88" />
      
      {/* Palm Trees Behind */}
      <PalmTree position={[-35, -1, 20]} scale={1.6} color="#ff00ff" />
      <PalmTree position={[40, -1, 40]} scale={1.4} color="#00ff88" />
      <PalmTree position={[-25, -1, 70]} scale={1.8} color="#00ff88" />
      <PalmTree position={[55, -1, 90]} scale={1.3} color="#ff00ff" />
      <PalmTree position={[-45, -1, 120]} scale={1.5} color="#00ff88" />
      <PalmTree position={[30, -1, 150]} scale={1.7} color="#ff00ff" />

      {/* Vaporwave Cars */}
      <VaporwaveCar position={[-35, 0, -40]} rotation={[0, Math.PI / 6, 0]} color="#00ff88" />
      <VaporwaveCar position={[42, 0, -80]} rotation={[0, -Math.PI / 4, 0]} color="#ff00ff" />
      <VaporwaveCar position={[6, 0.1, -100]} rotation={[0, 0, 0]} color="#0088ff" />
      <VaporwaveCar position={[-6, 0.1, -60]} rotation={[0, Math.PI, 0]} color="#ff0055" />
      
      {/* Vaporwave Cars Behind */}
      <VaporwaveCar position={[30, 0, 50]} rotation={[0, Math.PI / 3, 0]} color="#ffff00" />
      <VaporwaveCar position={[-40, 0, 90]} rotation={[0, -Math.PI / 5, 0]} color="#ff0055" />
      <VaporwaveCar position={[6, 0.1, 80]} rotation={[0, 0, 0]} color="#ff00ff" />
      <VaporwaveCar position={[-6, 0.1, 120]} rotation={[0, Math.PI, 0]} color="#00ff88" />

      {/* Road */}
      <SynthRoad width={16} />

      {/* Invisible Map Boundaries and Ceiling */}
      <RigidBody type="fixed">
        {/* Back Wall (Near Sun) */}
        <CuboidCollider position={[0, 15, -135]} args={[200, 15, 1]} />
        {/* Front Wall */}
        <CuboidCollider position={[0, 15, 135]} args={[200, 15, 1]} />
        {/* Left Wall */}
        <CuboidCollider position={[-135, 15, 0]} args={[1, 15, 200]} />
        {/* Right Wall */}
        <CuboidCollider position={[135, 15, 0]} args={[1, 15, 200]} />
        {/* Ceiling (Just above palm trees) */}
        <CuboidCollider position={[0, 18, 0]} args={[200, 1, 200]} />
      </RigidBody>

      {/* Base Plane (Flat) */}
      <RigidBody type="fixed" friction={2}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[400, 400]} />
          <meshBasicMaterial map={gridTexture} />
        </mesh>
      </RigidBody>

      {/* Gas Station */}
      <SynthGasStation position={[45, 0, 10]} rotation={[0, -Math.PI / 6, 0]} />

      {/* Street Lights along the road */}
      <StreetLight position={[-12, 0, -20]} />
      <StreetLight position={[12, 0, -40]} rotation={[0, Math.PI, 0]} />
      <StreetLight position={[-12, 0, -60]} />
      <StreetLight position={[12, 0, -80]} rotation={[0, Math.PI, 0]} />
      <StreetLight position={[-12, 0, -100]} />
      <StreetLight position={[12, 0, -120]} rotation={[0, Math.PI, 0]} />
    </>
  );
}

function SynthMountain({ position, scale, color, rotationY }: { position: [number, number, number], scale: [number, number, number], color: string, rotationY?: number }) {
  const rotY = rotationY ?? (position[0] * 123.456 + position[2] * 789.012) % Math.PI;
  return (
    <RigidBody type="fixed" position={position} rotation={[0, rotY, 0]} colliders={false}>
      <ConeCollider args={[scale[1] / 2, scale[0]]} position={[0, 0, 0]} />
      <mesh scale={scale}>
        <coneGeometry args={[1, 1, 4]} />
      <meshBasicMaterial color="#050510" />
      <mesh scale={[1.01, 1.01, 1.01]}>
        <coneGeometry args={[1, 1, 4]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      </mesh>
    </RigidBody>
  );
}

function SynthGasStation({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="trimesh">
      <group>
        {/* Base Platform */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[30, 0.4, 20]} />
        <meshStandardMaterial color="#222" metalness={0.5} roughness={0.8} />
      </mesh>
      
      {/* Canopy Roof */}
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[32, 1.5, 22]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Canopy Neon Trim - Cyan */}
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[32.5, 0.5, 22.5]} />
        <meshBasicMaterial color="#00ffcc" />
      </mesh>
      
      {/* Pillars */}
      {[-10, 10].map((x, i) =>
        [-6, 6].map((z, j) => (
          <group key={`pillar-${i}-${j}`} position={[x, 4, z]}>
            <mesh>
              <cylinderGeometry args={[0.5, 0.5, 8, 16]} />
              <meshStandardMaterial color="#333" metalness={0.4} roughness={0.7} />
            </mesh>
            {/* Pillar LED strips */}
            <mesh position={[0, 0, 0]} scale={[1.1, 1, 1.1]}>
              <cylinderGeometry args={[0.5, 0.5, 8, 4]} />
              <meshBasicMaterial color="#ff00aa" wireframe />
            </mesh>
          </group>
        ))
      )}

      {/* Pumps */}
      {[-5, 0, 5].map((x, i) => (
        <group key={`pump-${i}`} position={[x, 1.5, 0]}>
          <mesh>
            <boxGeometry args={[1.5, 3, 1]} />
            <meshStandardMaterial color="#111" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1, 0.55]}>
            <planeGeometry args={[1, 0.5]} />
            <meshBasicMaterial color="#00ffcc" />
          </mesh>
        </group>
      ))}

      {/* Futuristic Sign Base */}
      <mesh position={[20, 5, -8]}>
        <boxGeometry args={[2, 10, 2]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.5} />
      </mesh>

      {/* Sign Board */}
      <mesh position={[20, 12, -8]}>
        <boxGeometry args={[6, 4, 1.5]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Sign Neon */}
      <mesh position={[20, 12, -8]} scale={[1.05, 1.05, 1.05]}>
        <boxGeometry args={[6, 4, 1.5]} />
        <meshBasicMaterial color="#ff00aa" wireframe />
      </mesh>

      {/* Lighting */}
      <pointLight position={[0, 6, 0]} intensity={1} color="#00ffcc" distance={20} />
      <pointLight position={[20, 12, -6]} intensity={1.5} color="#ff00aa" distance={15} />
      </group>
    </RigidBody>
  );
}

function StreetLight({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders={false}>
      <CylinderCollider args={[4, 0.5]} position={[0, 4, 0]} />
      <group>
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.1, 0.2, 8, 8]} />
        <meshStandardMaterial color="#111" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[1, 8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.1, 2, 8]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[2, 7.9, 0]}>
        <boxGeometry args={[1, 0.2, 0.5]} />
        <meshBasicMaterial color="#00ffcc" />
      </mesh>
      <pointLight position={[2, 7.5, 0]} intensity={1} color="#00ffcc" distance={15} />
      </group>
    </RigidBody>
  );
}

function createGridTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#000000';
    context.fillRect(0, 0, 1024, 1024);

    const drawGrid = (color: string, offset: number) => {
        context.strokeStyle = color;
        context.lineWidth = 10;
        context.strokeRect(offset, offset, 1024 - (offset * 2), 1024 - (offset * 2));
        
        context.beginPath();
        context.moveTo(512 + offset, 0);
        context.lineTo(512 + offset, 1024);
        context.moveTo(0, 512 + offset);
        context.lineTo(1024, 512 + offset);
        context.stroke();
    }

    drawGrid('#00ff88', 0);  // Neon green
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(100, 100);
  
  if (typeof window !== 'undefined') {
    texture.anisotropy = 16;
  }
  
  return texture;
}

function SynthCloud({ position, scale = 1, color = "#ff00aa" }: { position: [number, number, number], scale?: number, color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2, 8, 8]} />
        <meshBasicMaterial color="#05010a" />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[2, 8, 8]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      
      <mesh position={[-2.5, -0.5, 0]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color="#05010a" />
      </mesh>
      <mesh position={[-2.5, -0.5, 0]} scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      
      <mesh position={[2.5, -0.2, 0]}>
        <sphereGeometry args={[1.8, 8, 8]} />
        <meshBasicMaterial color="#05010a" />
      </mesh>
      <mesh position={[2.5, -0.2, 0]} scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[1.8, 8, 8]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  );
}

function PalmTree({ position, scale = 1, color = "#d82dbf" }: { position: [number, number, number], scale?: number, color?: string }) {
  return (
    <RigidBody type="fixed" position={position} colliders="trimesh">
      <group scale={scale}>
        {/* Trunk pieces */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[Math.sin(i * 0.1) * 0.5, i * 1.2, 0]} rotation={[0, 0, -0.1]}>
          <cylinderGeometry args={[0.3 - i*0.02, 0.4 - i*0.02, 1.3, 6]} />
          <meshBasicMaterial color="#05010a" />
          <mesh scale={[1.05, 1.05, 1.05]}>
            <cylinderGeometry args={[0.3 - i*0.02, 0.4 - i*0.02, 1.3, 6]} />
            <meshBasicMaterial color={color} wireframe />
          </mesh>
        </mesh>
      ))}
      <group position={[Math.sin(7 * 0.1) * 0.5, 9, 0]}>
        {/* Leaves */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, angle, 0]}>
              <mesh position={[0, -0.5, 2]} rotation={[-1.2, 0, 0]}>
                <coneGeometry args={[1.5, 5, 3]} />
                <meshBasicMaterial color="#05010a" />
              </mesh>
              <mesh position={[0, -0.5, 2]} rotation={[-1.2, 0, 0]} scale={[1.05, 1.05, 1.05]}>
                <coneGeometry args={[1.5, 5, 3]} />
                <meshBasicMaterial color={color} wireframe />
              </mesh>
            </group>
          )
        })}
      </group>
      </group>
    </RigidBody>
  );
}

function VaporwaveCar({ position, rotation = [0, 0, 0], color = "#ffffff" }: { position: [number, number, number], rotation?: [number, number, number], color?: string }) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="hull">
      <group scale={1.5}>
        {/* Main Body */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[2.2, 0.4, 4.5]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.8, -0.2]}>
        <boxGeometry args={[1.6, 0.5, 2.0]} />
        <meshStandardMaterial color={0x111111} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Tail Lights */}
      <mesh position={[0, 0.4, 2.26]}>
        <boxGeometry args={[2.0, 0.15, 0.1]} />
        <meshBasicMaterial color="#ff0055" />
      </mesh>
      {/* Head Lights */}
      <mesh position={[0, 0.4, -2.26]}>
        <boxGeometry args={[1.8, 0.1, 0.1]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      {/* Wheels */}
      {[-1.1, 1.1].map((x, i) =>
        [-1.5, 1.4].map((z, j) => (
          <mesh key={`wheel-${i}-${j}`} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
            <meshStandardMaterial color="#222222" roughness={0.8} />
          </mesh>
        ))
      )}
      {/* Neon underglow */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.0, 5.0]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      </group>
    </RigidBody>
  );
}

function createBuildingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#000000'; // Pure black
    context.fillRect(0, 0, 512, 512);

    const colors = ['#00ff88', '#ff00ff', '#0088ff', '#ffff00']; // Bright neon windows

    // Draw horizontal rows of windows
    for (let y = 10; y < 512; y += 15) {
      if (Math.random() > 0.6) { // More rows
        let spanColor = colors[Math.floor(Math.random() * colors.length)];
        for (let x = 10; x < 512; x += (10 + Math.random() * 20)) {
          if (Math.random() > 0.85) { // Window lit more frequently again
            context.fillStyle = (Math.random() > 0.85) ? colors[Math.floor(Math.random() * colors.length)] : spanColor;
            context.fillRect(x, y, 6 + Math.random() * 12, 6);
          }
        }
      }
    }
  }
  return new THREE.CanvasTexture(canvas);
}

function SynthRoad({ length = 400, width = 30 }) {
  const dashCount = 20;
  return (
    <group position={[0, 0.1, 0]}>
      {/* Asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, length]} />
        <meshBasicMaterial color="#05020a" />
      </mesh>
      
      {/* Left Edge Line */}
      <mesh position={[-width / 2 + 0.5, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, length]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>

      {/* Right Edge Line */}
      <mesh position={[width / 2 - 0.5, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.5, length]} />
        <meshBasicMaterial color="#ff00ff" />
      </mesh>

      {/* Dashed Center Line */}
      {Array.from({ length: dashCount }).map((_, i) => {
        const z = -length / 2 + (i * length / dashCount) + (length / dashCount / 2);
        return (
          <mesh key={i} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, (length / dashCount) * 0.5]} />
            <meshBasicMaterial color="#00ff88" />
          </mesh>
        );
      })}
    </group>
  );
}

function SynthCity() {
  const buildingMaterials = useMemo(() => {
    return Array.from({ length: 4 }).map(() => {
      const tex = createBuildingTexture();
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      if (typeof window !== 'undefined') {
        tex.anisotropy = 8;
      }
      return new THREE.MeshBasicMaterial({ map: tex });
    });
  }, []);

  const [buildings] = useState(() => {
    const arr: { x: number, y: number, z: number, width: number, height: number, depth: number, matIndex: number }[] = [];
    
    const avoidObjects = [
      // Mountains (x, z, radius)
      [-65, -100, 25], [-50, -80, 20], [-85, -120, 30], [-110, -90, 30], [-32, -50, 15],
      [65, -100, 30], [55, -80, 20], [85, -120, 35], [120, -90, 30], [36, -60, 15],
      [-90, 120, 30], [100, 100, 35], [-140, 80, 25], [120, 140, 30], [-70, 40, 20], [80, 50, 20],
      // Palm Trees & Streetlights (x, z, radius)
      [-28, -5, 8], [-45, -25, 8], [-22, -55, 8], [-55, -75, 8], [-30, -105, 8], [-60, -135, 8], [-25, -165, 8],
      [30, -15, 8], [50, -30, 8], [25, -65, 8], [45, -85, 8], [35, -115, 8], [65, -140, 8], [32, -170, 8],
      [-35, 20, 8], [40, 40, 8], [-25, 70, 8], [55, 90, 8], [-45, 120, 8], [30, 150, 8],
      // Gas Station
      [45, 10, 25]
    ];

    // Simple deterministic PRNG so city is identical every time map loads
    let seed = 12345;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    let count = 0;
    let attempts = 0;
    while(count < 200 && attempts < 4000) {
        attempts++;
        let x = (random() - 0.5) * 380; // -190 to 190
        let z = (random() - 0.5) * 380; // -190 to 190

        // Keep clear of the road area (central strip)
        if (Math.abs(x) < 35) continue;
        
        // Ensure distance from central player spawn
        if (Math.abs(x) < 50 && Math.abs(z) < 50) continue;

        // Ensure sun is visible: No buildings in the sun direction
        if (z < -40 && Math.abs(x) < 120) continue;

        // Bias placement near the road edges or far back to create a dense city feel
        const isNearRoad = Math.abs(x) >= 35 && Math.abs(x) <= 100 && z > -40;
        const isFarBack = z > 80;
        
        if (!isNearRoad && !isFarBack && random() > 0.3) continue;

        const width = 15 + random() * 25;
        const depth = 15 + random() * 20;

        let intersection = false;
        
        // No interposing with other generated buildings
        for (const b of arr) {
          if (Math.abs(x - b.x) < (width/2 + b.width/2 + 5) && Math.abs(z - b.z) < (depth/2 + b.depth/2 + 5)) {
             intersection = true;
             break;
          }
        }
        if (intersection) continue;

        // No interposing with environment avoidObjects
        for (const [ox, oz, rad] of avoidObjects) {
          const dist = Math.sqrt(Math.pow(x - ox, 2) + Math.pow(z - oz, 2));
          if (dist < rad + Math.max(width/2, depth/2) + 5) { 
            intersection = true;
            break;
          }
        }
        if (intersection) continue;

        let height = 40 + random() * 120; // Base height 40 - 160
        // Some buildings can be mega-tall
        if (random() > 0.8) height += 80 + random() * 120;

        // Make backwall buildings massively tall
        if (z > 100) height += 80 + random() * 120;
        
        const y = height / 2 - 2; 
        
        const matIndex = Math.floor(random() * 4);

        arr.push({ x, y, z, width, height, depth, matIndex });
        count++;
    }
    
    arr.sort((a, b) => a.z - b.z);
    
    return arr;
  });

  const renderedBuildings = useMemo(() => {
    return buildings.map((b, i) => {
      const material = buildingMaterials[b.matIndex].clone();
      material.map = material.map?.clone() || null;
      if (material.map) {
        material.map.repeat.set(b.width / 15, b.height / 15);
        material.map.needsUpdate = true;
      }
      
      return (
        <RigidBody key={i} type="fixed" position={[b.x, b.y, b.z]} colliders="cuboid">
          <mesh material={material}>
            <boxGeometry args={[b.width, b.height, b.depth]} />
          </mesh>
        </RigidBody>
      );
    });
  }, [buildings, buildingMaterials]);

  return (
    <group>
      {renderedBuildings}
    </group>
  );
}

