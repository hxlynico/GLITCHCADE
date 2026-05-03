'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore, WEAPON_TYPES } from '@/store/gameStore';

const SPREAD = 120;

// Pre-generate spawn points so they are stable across re-renders
const AMMO_SPAWNS = Array.from({ length: 5 }).map((_, i) => {
  return {
    id: `ammo-${i}`,
    position: [(Math.random() - 0.5) * SPREAD, 1, (Math.random() - 0.5) * SPREAD] as [number, number, number],
  };
});

const HEALTH_SPAWNS = Array.from({ length: 5 }).map((_, i) => ({
  id: `health-${i}`,
  position: [(Math.random() - 0.5) * SPREAD, 1, (Math.random() - 0.5) * SPREAD] as [number, number, number],
  amount: 40,
}));

import { Float } from '@react-three/drei';
import { audioManager } from '@/lib/audioManager';

import { useShallow } from 'zustand/react/shallow';

export function Pickups() {
  const { addWeapon, heal, score, inventory } = useGameStore(useShallow(s => ({
    addWeapon: s.addWeapon, heal: s.heal, score: s.score, inventory: s.inventory
  })));

  // Weapon spawn mapping: 300, 600, 900, 1200...
  const weaponSpawns = useMemo(() => {
    const list = [
      { score: 300, id: 'neon-rifle', pos: [42, 1, 8] as [number, number, number] },
      { score: 600, id: 'plasma-shotgun', pos: [45, 1, 8] as [number, number, number] },
      { score: 900, id: 'pulse-smg', pos: [48, 1, 8] as [number, number, number] },
      { score: 1200, id: 'laser-cannon', pos: [45, 1, 12] as [number, number, number] },
      
      // Infinite-ish loop of weapon upgrades/refills at the gas station
      { score: 1500, id: 'neon-rifle', pos: [42, 1, 8] as [number, number, number] },
      { score: 1800, id: 'plasma-shotgun', pos: [45, 1, 8] as [number, number, number] },
      { score: 2100, id: 'pulse-smg', pos: [48, 1, 8] as [number, number, number] },
      { score: 2400, id: 'laser-cannon', pos: [45, 1, 12] as [number, number, number] },
      { score: 2700, id: 'neon-rifle', pos: [42, 1, 8] as [number, number, number] },
      { score: 3000, id: 'plasma-shotgun', pos: [45, 1, 8] as [number, number, number] },
    ];
    return list;
  }, []);

  return (
    <>
      {/* Spawn weapons at Gas Station [45, 0, 10] area based on score intervals */}
      {weaponSpawns.map((spawn, idx) => {
        const hasWeapon = inventory.some(w => w.id === spawn.id);
        return (
          <WeaponPickup 
            key={`${spawn.id}-${spawn.score}`} 
            weaponId={spawn.id} 
            position={spawn.pos} 
            active={score >= spawn.score && !hasWeapon}
            onPickup={() => addWeapon(spawn.id)} 
          />
        );
      })}

      {/* Spawn scattered Ammo Packs */}
      {AMMO_SPAWNS.map(spawn => (
        <AmmoPickup key={spawn.id} position={spawn.position} />
      ))}
      
      {/* Spawn scattered Health Packs */}
      {HEALTH_SPAWNS.map(spawn => (
        <HealthPickup key={spawn.id} position={spawn.position} amount={40} onHeal={heal} />
      ))}
    </>
  );
}

function WeaponPickup({ weaponId, position, active, onPickup }: { weaponId: string, position: [number, number, number], active: boolean, onPickup: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const weapon = WEAPON_TYPES[weaponId];
  const [pickedUp, setPickedUp] = useState(false);
  const paused = useGameStore(s => s.paused);

  useFrame((state) => {
    if (paused || !ref.current || pickedUp || !active) return;
    
    // Bobbing and spinning effect
    ref.current.rotation.y += 0.02;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;

      // Distance check to player (Camera is the player position essentially)
      const playerPos = state.camera.position;
      const dist = ref.current.position.distanceTo(playerPos);
      if (dist < 2.5) {
        setPickedUp(true);
        audioManager.playPickup('weapon');
        onPickup();
      }
  });

  return (
    <group ref={ref} position={position} visible={active && !pickedUp}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <group scale={[0.5, 0.5, 0.5]}>
          {/* A more gun-like shape */}
          <mesh position={[0.4, 0, 0]}>
            <boxGeometry args={[1.2, 0.3, 0.2]} />
            <meshStandardMaterial emissive={weapon.color} emissiveIntensity={2} color="#222" />
          </mesh>
          <mesh position={[-0.1, -0.3, 0]} rotation={[0, 0, -0.2]}>
            <boxGeometry args={[0.3, 0.6, 0.2]} />
            <meshStandardMaterial emissive={weapon.color} emissiveIntensity={1} color="#222" />
          </mesh>
          <mesh position={[0.4, 0, 0]}>
            <boxGeometry args={[1.3, 0.4, 0.3]} />
            <meshBasicMaterial color={weapon.color} wireframe />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

function HealthPickup({ position, amount, onHeal }: { position: [number, number, number], amount: number, onHeal: (amount: number) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [pickedUp, setPickedUp] = useState(false);
  const color = "#ff2244"; // Red/Pink neon color for health
  const paused = useGameStore(s => s.paused);

  useEffect(() => {
    if (pickedUp) {
      const timer = setTimeout(() => {
        if (useGameStore.getState().paused) {
             // If paused when timer ends, we might want to delay? 
             // But respawn is fine to happen in background usually.
        }
        setPickedUp(false);
      }, 30000); // 30 seconds respawn
      return () => clearTimeout(timer);
    }
  }, [pickedUp]);

  useFrame((state) => {
    if (paused || !ref.current || pickedUp) return;
    
    // Bobbing and spinning effect
    ref.current.rotation.y += 0.03;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2.5) * 0.25;

      // Distance check to player
      const playerPos = state.camera.position;
      const dist = ref.current.position.distanceTo(playerPos);
      if (dist < 2.5) {
        setPickedUp(true);
        audioManager.playPickup('health');
        onHeal(amount);
      }
  });

  return (
    <group ref={ref} position={position} visible={!pickedUp}>
      {/* Cross shape for health */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={2} color="#fff" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.3, 0.3]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={2} color="#fff" />
      </mesh>
      {/* Wireframe outer shell */}
      <mesh>
        <boxGeometry args={[0.9, 0.9, 0.4]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  );
}

function AmmoPickup({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const [pickedUp, setPickedUp] = useState(false);
  const color = "#ffaa00"; // Orange color for generic ammo
  const [amountGiven, setAmountGiven] = useState(0); // To flash amount, maybe? Not used yet
  const paused = useGameStore(s => s.paused);

  useEffect(() => {
    if (pickedUp) {
      const timer = setTimeout(() => {
        setPickedUp(false);
      }, 25000); // 25 seconds respawn
      return () => clearTimeout(timer);
    }
  }, [pickedUp]);

  useFrame((state) => {
    if (paused || !ref.current || pickedUp) return;
    
    ref.current.rotation.y += 0.04;
      ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.15;

      const playerPos = state.camera.position;
      const dist = ref.current.position.distanceTo(playerPos);
      if (dist < 2.5) {
        setPickedUp(true);
        audioManager.playPickup('ammo');
        const gameState = useGameStore.getState();
        const currentWeapon = gameState.inventory[gameState.currentWeaponIndex];
        
        if (currentWeapon && currentWeapon.type !== 'melee') {
            // Give 1.5x magazine size worth of ammo, rounded up
            const amount = Math.ceil((currentWeapon.magazineSize || 30) * 1.5);
            gameState.addAmmo(currentWeapon.id, amount);
        }
      }
  });

  return (
    <group ref={ref} position={position} visible={!pickedUp}>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.4, 8]} />
        <meshStandardMaterial emissive={color} emissiveIntensity={1} color="#333" />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 8]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
    </group>
  );
}


