import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, BallCollider } from '@react-three/rapier';
import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useGameStore, ProjectileData, ExplosionData } from '@/store/gameStore';
import { audioManager } from '@/lib/audioManager';

const projGeometry = new THREE.SphereGeometry(0.3, 8, 8);
const playerMaterial = new THREE.MeshBasicMaterial({ color: '#00ffff' });
const enemyMaterial = new THREE.MeshBasicMaterial({ color: '#ff0055' });

export function ProjectilesManager() {
  const projectiles = useGameStore(s => s.projectiles);
  const explosions = useGameStore(s => s.explosions);
  return (
    <>
      {projectiles.map(p => (
        <Projectile key={p.id} data={p} />
      ))}
      {explosions.map(e => (
        <Explosion key={e.id} data={e} />
      ))}
    </>
  );
}

function Projectile({ data }: { data: ProjectileData }) {
  const ref = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const removeProjectile = useGameStore(s => s.removeProjectile);
  const takeDamage = useGameStore(s => s.takeDamage);
  const paused = useGameStore(s => s.paused);
  const hitEnemies = useRef<Set<any>>(new Set());

  const startPos = useMemo(() => new THREE.Vector3(...data.position), [data.position]);
  const dir = useMemo(() => new THREE.Vector3(...data.direction).normalize(), [data.direction]);
  const currentPosVector = useMemo(() => new THREE.Vector3(), []);

  // Remove projectile if it flies too far or lives too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      removeProjectile(data.id);
    }, data.projType === 'melee' ? 300 : 2000);
    return () => clearTimeout(timeout);
  }, [data.id, data.projType, removeProjectile]);

  useFrame(() => {
    if (paused || !ref.current) return;
    const currentPos = ref.current.translation();
    currentPosVector.set(currentPos.x, currentPos.y, currentPos.z);
    
    if (currentPosVector.distanceTo(startPos) > 120) {
      removeProjectile(data.id);
    }
  });

  const handleIntersection = (e: any) => {
    const rb = e.other?.rigidBodyObject || e.rigidBodyObject || e.colliderObject;
    if (!rb) return;

    let currentPos = { x: data.position[0], y: data.position[1], z: data.position[2] };
    if (ref.current) {
        const t = ref.current.translation();
        currentPos = { x: t.x, y: t.y, z: t.z };
    }

    const isEnemy = rb.userData?.isEnemy;
    const onHit = rb.userData?.onHit;
    const isPlayer = rb.userData?.isPlayer || rb.name === 'player';
    const enemyId = rb.userData?.id;

    // Ignore collisions with other projectiles
    if (rb.userData?.isProjectile) return;

    if (data.isEnemy) {
        if (isPlayer) {
            takeDamage(data.damage);
            audioManager.playPlayerHit();
            removeProjectile(data.id);
            if (data.projType === 'bomb') {
              useGameStore.getState().addExplosion({ id: Math.random().toString(), position: [currentPos.x, currentPos.y, currentPos.z], color: data.color, size: data.size || 3 });
            }
        } else if (!isEnemy) {
            removeProjectile(data.id);
            if (data.projType === 'bomb') {
              useGameStore.getState().addExplosion({ id: Math.random().toString(), position: [currentPos.x, currentPos.y, currentPos.z], color: data.color, size: data.size || 3 });
            }
        }
    } else {
        if (isEnemy && onHit) {
            // Provide an ID or use a random fallback if undefined (though this might hit same enemy twice if no ID)
            const idToTrack = enemyId || Math.random();
            if (!hitEnemies.current.has(idToTrack)) {
               hitEnemies.current.add(idToTrack);
               onHit(data.damage);
               
               if (data.projType !== 'melee') {
                  removeProjectile(data.id);
               }
               if (data.projType === 'bomb') {
                 useGameStore.getState().addExplosion({ id: Math.random().toString(), position: [currentPos.x, currentPos.y, currentPos.z], color: data.color, size: data.size || 3 });
               }
            }
        } else if (!isPlayer) {
            if (data.projType !== 'melee') {
               removeProjectile(data.id);
            }
            if (data.projType === 'bomb') {
              useGameStore.getState().addExplosion({ id: Math.random().toString(), position: [currentPos.x, currentPos.y, currentPos.z], color: data.color, size: data.size || 3 });
            }
        }
    }
  };

  const material = data.isEnemy ? enemyMaterial : playerMaterial;

  return (
    <RigidBody
      ref={ref}
      position={data.position}
      linearVelocity={paused ? [0, 0, 0] : [dir.x * data.speed, dir.y * data.speed, dir.z * data.speed]}
      type="dynamic"
      gravityScale={data.gravity ? 1.5 : 0}
      colliders={false}
      sensor
      onIntersectionEnter={handleIntersection}
      userData={{ isProjectile: true }}
    >
      <BallCollider args={[data.isEnemy ? 0.3 : (data.projType === 'melee' ? 3.0 : 0.8)]} />
      <mesh 
        ref={meshRef} 
        geometry={projGeometry} 
        material={material} 
        scale={data.size ? [data.size, data.size, data.size] : [1, 1, 1]}
        visible={data.projType !== 'melee'}
      />
    </RigidBody>
  );
}

function Explosion({ data }: { data: ExplosionData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const removeExplosion = useGameStore(s => s.removeExplosion);
  
  // Use refs instead of state for performance
  const animState = useRef({ scale: 0.1, opacity: 1 });
  const hitEnemies = useRef<Set<number>>(new Set());
  const paused = useGameStore(s => s.paused);

  useEffect(() => {
    // Play explosion sound
    audioManager.playExplosion(data.size / 5);

    const timeout = setTimeout(() => {
      removeExplosion(data.id);
    }, 500); // Exists for 0.5 seconds
    return () => clearTimeout(timeout);
  }, [data.id, removeExplosion, data.size]);

  useFrame((state, delta) => {
    if (paused || !meshRef.current) return;
    
    animState.current.scale = Math.min(data.size, animState.current.scale + delta * data.size * 5);
    animState.current.opacity = Math.max(0, animState.current.opacity - delta * 2);
    
    const { scale, opacity } = animState.current;
    
    meshRef.current.scale.set(scale, scale, scale);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = opacity;
  });

  const handleIntersection = (e: any) => {
    const rb = e.other?.rigidBodyObject || e.rigidBodyObject || e.colliderObject;
    if (!rb) return;

    const isEnemy = rb.userData?.isEnemy;
    const onHit = rb.userData?.onHit;
    // We only process damage once per enemy to avoid rapid multiple damage ticks
    if (isEnemy && onHit && rb.userData?.id) {
       if (!hitEnemies.current.has(rb.userData.id)) {
           hitEnemies.current.add(rb.userData.id);
           onHit(50); // Explosion damage fixed at 50
       }
    } else if (isEnemy && onHit) {
       // if they don't have id just apply it
       onHit(50);
    }
  };

  return (
    <RigidBody 
      type="fixed" 
      position={data.position} 
      colliders="ball" 
      sensor 
      onIntersectionEnter={handleIntersection}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={data.color} transparent opacity={1} />
      </mesh>
    </RigidBody>
  );
}
