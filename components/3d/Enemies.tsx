'use client';

import { useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, useRapier, BallCollider } from '@react-three/rapier';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { Billboard } from '@react-three/drei';
import { audioManager } from '@/lib/audioManager';

type EnemyType = 'drone' | 'spider' | 'retro-bot' | 'boss' | 'swordsman';

interface EnemyData {
  id: number;
  position: [number, number, number];
  type: EnemyType;
}

// Global ref to track enemy positions for separation logic without triggering re-renders
const enemyPositions = new Map<number, THREE.Vector3>();
export const playerGlobalPos = new THREE.Vector3(0, 0, 0);

const OBSTACLES = [
  // Mountains (x, z, radius)
  [-65, -100, 25], [-50, -80, 20], [-85, -120, 30], [-110, -90, 30], [-32, -50, 15],
  [65, -100, 30], [55, -80, 20], [85, -120, 35], [120, -90, 30], [36, -60, 15],
  [-90, 120, 30], [100, 100, 35], [-140, 80, 25], [120, 140, 30], [-70, 40, 20], [80, 50, 20],
  // Palm Trees (x, z, radius)
  [-28, -5, 8], [-45, -25, 8], [-22, -55, 8], [-55, -75, 8], [-30, -105, 8], [-60, -135, 8], [-25, -165, 8],
  [30, -15, 8], [50, -30, 8], [25, -65, 8], [45, -85, 8], [35, -115, 8], [65, -140, 8], [32, -170, 8],
  [-35, 20, 8], [40, 40, 8], [-25, 70, 8], [55, 90, 8], [-45, 120, 8], [30, 150, 8],
  // Gas Station
  [45, 10, 25]
];

function getValidSpawnPoint(initialRadius?: number): {x: number, z: number} {
  let x = 0, z = 0, angle, radius;
  let valid = false;
  let attempts = 0;
  while (!valid && attempts < 50) {
    if (initialRadius !== undefined) {
      angle = Math.random() * Math.PI * 2;
      x = playerGlobalPos.x + Math.cos(angle) * initialRadius;
      z = playerGlobalPos.z + Math.sin(angle) * initialRadius;
    } else {
      // Spawn uniformly across the map boundaries, but favor edges if needed, or just random
      x = (Math.random() - 0.5) * 200;
      z = (Math.random() - 0.5) * 200;
    }
    
    // Keep away from the player's current position
    if (Math.hypot(x - playerGlobalPos.x, z - playerGlobalPos.z) < 30) {
      if (initialRadius === undefined) {
          x += (x > playerGlobalPos.x ? 35 : -35);
          z += (z > playerGlobalPos.z ? 35 : -35);
      } else {
          attempts++;
          continue;
      }
    }

    valid = true;
    for (const [ox, oz, rad] of OBSTACLES) {
      if (Math.hypot(x - ox, z - oz) < rad + 5) {
        valid = false;
        break;
      }
    }
    attempts++;
  }
  return { x, z };
}

export function Enemies() {
  const nextId = useRef(20);
  const [startTime] = useState(() => Date.now());
  const lastBossDeathTime = useRef(0);
  const [enemies, setEnemies] = useState<EnemyData[]>([]);
  const paused = useGameStore(s => s.paused);
  const isDead = useGameStore(s => s.isDead);

  useEffect(() => {
    const interval = setInterval(() => {
      if (paused || isDead) return;
      setEnemies(prev => {
        const timeSinceStart = (Date.now() - startTime) / 1000;
        
        // No enemies in the first 1 seconds
        if (timeSinceStart < 1) return prev;

        const currentScore = useGameStore.getState().score;
        
        // Gradual increase: base 3 enemies + 1 per 250 score
        let maxEnemies = 2 + Math.floor(currentScore / 300);
        
        // Also increase max enemies smoothly based on time if score is low
        const timeBonus = Math.floor((timeSinceStart - 1) / 15); // +1 every 15 seconds
        maxEnemies = Math.max(maxEnemies, 2 + timeBonus);
        
        if (maxEnemies > 10) maxEnemies = 10;

        if (prev.length >= maxEnemies) return prev;
        
        // Balanced enemy types
        const types: EnemyType[] = ['drone', 'spider', 'retro-bot', 'swordsman'];
        let type: EnemyType = types[Math.floor(Math.random() * types.length)];
        
        let targetBossCount = 0;
        if (currentScore >= 3000) {
            targetBossCount = 2;
        } else if (currentScore >= 800) {
            targetBossCount = 1;
        }
        
        // Delay boss spawn for 20 seconds after the last one died
        if (Date.now() - lastBossDeathTime.current < 20000) {
            targetBossCount = 0;
        }
        
        const currentBossCount = prev.filter(e => e.type === 'boss').length;
        
        if (currentBossCount < targetBossCount) {
            type = 'boss';
        }

        // Spawn 1 to 3 enemies if we are far behind max
        const numToSpawn = Math.min(maxEnemies - prev.length, Math.floor(Math.random() * 3) + 1);
        const toAdd: EnemyData[] = [];

        for (let i = 0; i < numToSpawn; i++) {
            if (i > 0 && type === 'boss') type = types[Math.floor(Math.random() * types.length)]; // Don't spawn multiple bosses in same tick unless we explicitly checked

            const radius = type === 'boss' ? 45 : 35 + Math.random() * 50;
            let spawnedPos = getValidSpawnPoint(radius);
            
            if (type === 'boss' && currentBossCount > 0) {
                const existingBoss = prev.find(e => e.type === 'boss');
                if (existingBoss) {
                    const exAngle = Math.atan2(existingBoss.position[2] - playerGlobalPos.z, existingBoss.position[0] - playerGlobalPos.x);
                    const oppositeAngle = exAngle + Math.PI + (Math.random() - 0.5) * Math.PI / 4;
                    spawnedPos = { 
                      x: playerGlobalPos.x + Math.cos(oppositeAngle) * radius, 
                      z: playerGlobalPos.z + Math.sin(oppositeAngle) * radius 
                    };
                }
            }
            
            const x = spawnedPos.x;
            const z = spawnedPos.z;
            const y = type === 'boss' ? 12 : type === 'drone' ? 3 : 0.8;

            toAdd.push({ id: nextId.current++, position: [x, y, z], type });
        }

        return [...prev, ...toAdd];
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [startTime, paused, isDead]);

  const handleEnemyDie = (id: number, diedType: EnemyType) => {
    if (diedType === 'boss') {
      lastBossDeathTime.current = Date.now();
      useGameStore.getState().heal(100);
    }
    // We only process logic here, removal is handled by handleCompleteRemoval after animation
  };

  const handleCompleteRemoval = (id: number) => {
    setEnemies(prev => prev.filter(e => e.id !== id));
  };

  return (
    <>
      {enemies.map((e) => (
        <Enemy 
            key={e.id} 
            id={e.id} 
            position={e.position} 
            type={e.type} 
            onDie={handleEnemyDie} 
            onCompleteRemoval={handleCompleteRemoval}
        />
      ))}
    </>
  );
}

function Enemy({ id, position, type, onDie, onCompleteRemoval }: { id: number, position: [number, number, number], type: EnemyType, onDie: (id: number, type: EnemyType) => void, onCompleteRemoval: (id: number) => void }) {
  const ref = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Group>(null);
  const addScore = useGameStore(s => s.addScore);
  const takeDamage = useGameStore(s => s.takeDamage);
  const isDeadGlobal = useGameStore(s => s.isDead);
  const paused = useGameStore(s => s.paused);
  
  // Cleanup position on unmount
  useEffect(() => {
    return () => {
      enemyPositions.delete(id);
    };
  }, [id]);
  
  // Calculate maxHp scaled to score at spawn time
  const [initialScore] = useState(() => useGameStore.getState().score);
  const baseMaxHp = type === 'boss' ? 5000 : type === 'retro-bot' ? 300 : type === 'swordsman' ? 250 : type === 'spider' ? 150 : 200;
  // +25% HP for every 1000 score
  const maxHp = useMemo(() => Math.floor(baseMaxHp * (1 + (initialScore / 1000) * 0.25)), [baseMaxHp, initialScore]);

  const color = type === 'boss' ? '#ff0000' : type === 'drone' ? '#ff6600' : type === 'spider' ? '#880000' : type === 'swordsman' ? '#00ffaa' : '#44aaff';
  
  const currentHpRef = useRef(maxHp);
  const isDeadRef = useRef(false);

  const [hp, setHp] = useState(maxHp);
  const [dead, setDead] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [spawned, setSpawned] = useState(false);
  const spawnScale = useRef(0);
  const [hitFlash, setHitFlash] = useState(true);

  // Pre-allocate vectors to avoid GC overhead in useFrame
  const posVector = useMemo(() => new THREE.Vector3(), []);
  const dirToPlayer = useMemo(() => new THREE.Vector3(), []);
  const leftOffset = useMemo(() => new THREE.Vector3(), []);
  const rightOffset = useMemo(() => new THREE.Vector3(), []);
  const pDir = useMemo(() => new THREE.Vector3(), []);
  const throwDir = useMemo(() => new THREE.Vector3(), []);
  const rightVector = useMemo(() => new THREE.Vector3(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempDir = useMemo(() => new THREE.Vector3(), []);
  const toEnemy = useMemo(() => new THREE.Vector3(), []);
  const dirToPlayerXZ = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    // Initial spawn flash
    const timer = setTimeout(() => setHitFlash(false), 300);
    return () => clearTimeout(timer);
  }, []);
  const [hovered, setHovered] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(true);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation();
    hoverTimeout.current = setTimeout(() => {
      setHovered(false);
    }, 1500); // 1.5 seconds delay before disappearing
  };

  const lastShot = useRef(0);
  const lastShotRevolver = useRef(0);
  const lastShotMG = useRef(0);
  const lastShotBomb = useRef(0);
  const { rapier, world } = useRapier();

  const [isIdle, setIsIdle] = useState(false);
  useEffect(() => {
    // Some enemies pause to ambush or stalk
    const interval = setInterval(() => {
      if (paused) return;
      if (type === 'spider' || type === 'drone') {
        // 20% chance to be idle
        setIsIdle(Math.random() > 0.8);
      } else {
        setIsIdle(false);
      }
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, [paused, type]);

  // Ambient sounds
  useEffect(() => {
    if (dead) return;
    const interval = setInterval(() => {
      if (paused) return;
      // 30% chance every check to play a subtle sound
      if (Math.random() > 0.7) {
        audioManager.playEnemyAmbient(type);
      }
    }, 4000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, [type, dead, paused]);

  const handleHit = (damage: number) => {
    if (isDeadRef.current) return;
    setHitFlash(true);
    setTimeout(() => setHitFlash(false), 150);
    
    // Play hit sound
    audioManager.playEnemyHit(type);

    currentHpRef.current -= damage;
    setHp(currentHpRef.current);

    if (currentHpRef.current <= 0 && !isDeadRef.current) {
        isDeadRef.current = true;
        setDead(true);
        addScore(type === 'boss' ? 150 : 50);
        
        // Add explosion visual
        const addExplosion = useGameStore.getState().addExplosion;
        const translation = ref.current?.translation() || { x: position[0], y: position[1], z: position[2] };
        addExplosion({
          id: Math.random().toString(),
          position: [translation.x, translation.y, translation.z],
          color: color,
          size: type === 'boss' ? 15 : 5
        });

        // Play death sound
        audioManager.playEnemyDeath(type);

        onDie(id, type);
    }
  };

  useFrame((state, delta) => {
    if (paused || removed || !ref.current || !meshRef.current) return;
    
    if (dead) {
        meshRef.current.rotation.y += delta * 50;
        meshRef.current.rotation.z += delta * 40;
        const nextScale = Math.max(0, meshRef.current.scale.x - delta * 1.5);
        meshRef.current.scale.setScalar(nextScale);
        if (nextScale <= 0 && !removed) {
            setRemoved(true);
            onCompleteRemoval(id);
        }
        return;
    }

    if (!spawned) {
        spawnScale.current += delta * 2.5;
        meshRef.current.scale.setScalar(spawnScale.current);
        meshRef.current.rotation.y += delta * 10;
        if (spawnScale.current >= 1) {
            spawnScale.current = 1;
            meshRef.current.scale.setScalar(1);
            setSpawned(true);
        }
    }

    const time = state.clock.elapsedTime;
    const playerPos = state.camera.position;
    playerGlobalPos.copy(playerPos);
    
    const currentTranslation = ref.current.translation();
    posVector.set(currentTranslation.x, currentTranslation.y, currentTranslation.z);
    
    // Update global position ref
    enemyPositions.set(id, posVector);

    // Direction to player
    dirToPlayer.subVectors(playerPos, posVector);
    // Ignore Y when estimating distance/direction for ground chase
    const distToPlayerXZ = dirToPlayerXZ.set(dirToPlayer.x, dirToPlayer.z).length();
    
    // Projectile dodging
    let dodgeX = 0;
    let dodgeZ = 0;
    if (type === 'drone' || type === 'spider') { // Agile enemies dodge
      const projectiles = useGameStore.getState().projectiles;
      for (const p of projectiles) {
        if (p.isEnemy) continue;
        tempPos.fromArray(p.position);
        tempDir.fromArray(p.direction);
        toEnemy.subVectors(posVector, tempPos);
        const dist = toEnemy.length();
        
        // Projectile is close and approaching
        if (dist < 20) {
          toEnemy.normalize();
          // If projectile direction aligns with vector to enemy
          if (toEnemy.dot(tempDir) > 0.9) {
            // Dodge perpendicular to projectile path
            rightVector.crossVectors(tempDir, new THREE.Vector3(0, 1, 0)).normalize();
            // Choose dodge direction based on current position relative to projectile path
            const dotRight = toEnemy.dot(rightVector);
            const dodgeDir = dotRight > 0 ? 1 : -1;
            const dodgeMag = type === 'drone' ? 1.5 : 3.5;
            dodgeX += rightVector.x * dodgeDir * dodgeMag;
            dodgeZ += rightVector.z * dodgeDir * dodgeMag;
          }
        }
      }
    }
    
    // Movement behavior
    let targetX = currentTranslation.x;
    let targetZ = currentTranslation.z;
    // Ground enemies should target their radius so they don't fight the floor collider constantly
    const rad = type === 'boss' ? 5 : 1.2;
    let targetY = type === 'boss' ? 12 : type === 'drone' ? 2.5 + Math.sin(time * 3) * 0.5 : rad;

    // Movement speed multiplier
    const currentScore = useGameStore.getState().score;
    const speedMultiplier = 1 + Math.min(1.5, (currentScore / 2000) * 0.2); // max 1.3x speed scaling to prevent them getting insanely fast
    
    // Balance base speeds
    const baseSpeed = (
      type === 'boss' ? 3.0 : 
      type === 'spider' ? 3.2 : 
      type === 'swordsman' ? 4.8 : 
      type === 'retro-bot' ? 3.8 : 
      type === 'drone' ? 3.5 : 
      3.5
    ) * speedMultiplier;
    
    // Smooth velocity to apply this frame
    let frameVelocityX = 0;
    let frameVelocityZ = 0;
    
    // Minimum distance to chase
    // Swordsman needs a bigger chase min dist so they don't get stuck pushing the player collider
    const chaseMinDist = (type === 'swordsman') ? 2.5 : (type === 'drone') ? 15 : (type === 'boss') ? 5 : 3;

    if (!isDeadGlobal && distToPlayerXZ < 90 && distToPlayerXZ > chaseMinDist && !isIdle) {
        // Chase player
        const normalizedDirX = dirToPlayer.x / distToPlayerXZ;
        const normalizedDirZ = dirToPlayer.z / distToPlayerXZ;
        
        // Strafing logic
        let strafeX = 0;
        let strafeZ = 0;
        
        // Drone and Retro-bot strafe when they get into combat range
        if ((type === 'drone' || type === 'retro-bot' || type === 'boss') && distToPlayerXZ < 30) {
            const strafeMag = type === 'drone' ? 1.5 : type === 'boss' ? 8 : 4;
            const strafeTime = time * (type === 'drone' ? 0.5 : type === 'boss' ? 2 : 0.8) + id; // id gives unique phase
            
            // Perpendicular to player direction
            const perpX = -normalizedDirZ;
            const perpZ = normalizedDirX;
            
            strafeX = perpX * Math.sin(strafeTime) * strafeMag;
            strafeZ = perpZ * Math.sin(strafeTime) * strafeMag;
        }
        
        const moveX = (normalizedDirX * baseSpeed + strafeX + dodgeX);
        const moveZ = (normalizedDirZ * baseSpeed + strafeZ + dodgeZ);
        
        if (type === 'spider' || type === 'boss') {
            if (type === 'boss' || Math.sin(time * 12) > 0) {
                frameVelocityX = moveX;
                frameVelocityZ = moveZ;
                targetY += Math.abs(Math.sin(time * (type === 'boss' ? 4 : 24))) * (type === 'boss' ? 0.5 : 0.8);
            }
        } else {
            frameVelocityX = moveX;
            frameVelocityZ = moveZ;
        }
    } else if (!isDeadGlobal) {
        // Patrol
        frameVelocityX = Math.sin(time * 0.3) * baseSpeed * 0.5;
        frameVelocityZ = Math.cos(time * 0.3) * baseSpeed * 0.5;
    }
    
    // --- AI: Separation (Avoid clumping with other enemies) ---
    const separationDist = type === 'boss' ? 40 : 6;
    const separationForce = type === 'boss' ? 1.5 : 0.6;
    
    enemyPositions.forEach((otherPos, otherId) => {
        if (otherId === id) return;
        
        const dx = posVector.x - otherPos.x;
        const dz = posVector.z - otherPos.z;
        const distSq = dx * dx + dz * dz;
        const minDistSq = separationDist * separationDist;
        
        if (distSq < minDistSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            // Stronger push the closer they are
            const force = (separationDist - dist) / separationDist;
            frameVelocityX += (dx / dist) * baseSpeed * force * separationForce;
            frameVelocityZ += (dz / dist) * baseSpeed * force * separationForce;
        }
    });

    // --- AI: Smarter Obstacle Avoidance ---
    let avoiding = false;
    for (const [ox, oz, rad] of OBSTACLES) {
        const dx = posVector.x - ox;
        const dz = posVector.z - oz;
        const distSq = dx * dx + dz * dz;
        const buffer = type === 'boss' ? 20 : 12; // Large buffer for enemies
        const avoidDist = rad + buffer;
        const avoidDistSq = avoidDist * avoidDist;
        
        if (distSq < avoidDistSq) {
            avoiding = true;
            const dist = Math.sqrt(distSq);
            const normalX = dx / dist;
            const normalZ = dz / dist;
            
            // Push away from obstacle
            const pushMagnitude = Math.pow((avoidDist - dist) / avoidDist, 2) * 5;
            frameVelocityX += normalX * baseSpeed * pushMagnitude;
            frameVelocityZ += normalZ * baseSpeed * pushMagnitude;
            
            // Tangent steering (slide around mountains)
            const tangentX = -normalZ;
            const tangentZ = normalX;
            
            // Choose the tangent that takes us towards player
            dirToPlayerXZ.set(playerPos.x - posVector.x, playerPos.z - posVector.z).normalize();
            const dotToPlayer = (tangentX * dirToPlayerXZ.x + tangentZ * dirToPlayerXZ.y);
            let side = dotToPlayer > 0 ? 1 : -1;
            
            // If they are getting stuck against the wall, force a stronger side bias
            if (Math.abs(dotToPlayer) < 0.2) side *= 1.5; 

            const slideMagnitude = (avoidDist - dist) / avoidDist * 4;
            frameVelocityX += tangentX * side * baseSpeed * slideMagnitude;
            frameVelocityZ += tangentZ * side * baseSpeed * slideMagnitude;
        }
    }

    // Map boundaries avoidance
    if (posVector.x < -145) frameVelocityX += baseSpeed * 10;
    if (posVector.x > 145) frameVelocityX -= baseSpeed * 10;
    if (posVector.z < -145) frameVelocityZ += baseSpeed * 10;
    if (posVector.z > 145) frameVelocityZ -= baseSpeed * 10;

    // Apply calculated frame velocity using physics to allow collisions
    const pControllerY = (targetY - currentTranslation.y) * (type === 'spider' ? 15 : 5);
    
    // Quick lerp for velocity to smooth stutters
    const currentVelocity = ref.current.linvel();
    ref.current.setLinvel({
      x: THREE.MathUtils.lerp(currentVelocity.x, frameVelocityX, delta * 15),
      y: pControllerY,
      z: THREE.MathUtils.lerp(currentVelocity.z, frameVelocityZ, delta * 15)
    }, true);


    // Look at player
    meshRef.current.lookAt(playerPos.x, type === 'drone' ? currentTranslation.y : 1, playerPos.z);

    // Animate spider legs / robot parts
    if (type === 'spider') {
      const crawlSpeed = 20;
      meshRef.current.children[0].children.forEach((leg, i) => {
        leg.rotation.x = Math.sin(time * crawlSpeed + i) * 0.5 - 0.5;
      });
    }

    // Attack mechanics
    if (!isDeadGlobal) {
      const distToPlayer = posVector.distanceTo(playerPos);
      const aggroRange = type === 'boss' ? 120 : type === 'retro-bot' ? 60 : 40;
      const isVisible = distToPlayer < aggroRange;
      
      const now = performance.now();
      dirToPlayer.subVectors(playerPos, posVector).normalize();
      
      if (isVisible) {
        if (type === 'boss') {
          // Machine Gun (Fast, low damage, maybe from left side)
          if (now - lastShotMG.current > 150) {
            lastShotMG.current = now;
            // Only play sound every 10th shot to reduce annoyance while maintaining visual fire rate
            if (Math.floor(now / 150) % 10 === 0) {
              audioManager.playEnemyShoot('boss');
            }
            // Left offset
            leftOffset.set(-2, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), Math.atan2(dirToPlayer.x, dirToPlayer.z));
            pDir.copy(dirToPlayer).add(tempDir.set((Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1, (Math.random()-0.5)*0.1)).normalize();
            
            useGameStore.getState().addProjectile({
              id: Math.random().toString(),
              position: posVector.clone().add(leftOffset).add(tempDir.copy(pDir).multiplyScalar(4)).toArray(),
              direction: pDir.toArray(),
              damage: 5,
              color: '#00ffcc',
              isEnemy: true,
              speed: 50,
              size: 0.5,
              createdAt: Date.now()
            });
          }
          
          // Revolver/Sniper (Slow, high damage, from the center/nose)
          if (now - lastShotRevolver.current > 2000) {
            lastShotRevolver.current = now;
            audioManager.playShoot('laser-cannon');
            useGameStore.getState().addProjectile({
              id: Math.random().toString(),
              position: posVector.clone().add(tempDir.copy(dirToPlayer).multiplyScalar(4)).toArray(),
              direction: dirToPlayer.toArray(),
              damage: 50,
              color: '#ff0000',
              isEnemy: true,
              speed: 80,
              size: 2,
              createdAt: Date.now()
            });
          }
          
          // Bomb thrower (Arching/Gravity, from the right side)
          if (now - lastShotBomb.current > 3000) {
            lastShotBomb.current = now;
            audioManager.playExplosion(0.8);
            rightOffset.set(2, 0, 0).applyAxisAngle(new THREE.Vector3(0,1,0), Math.atan2(dirToPlayer.x, dirToPlayer.z));
            // Add an upward trajectory for the arch
            throwDir.copy(dirToPlayer).add(tempDir.set(0, 0.4, 0)).normalize();
            useGameStore.getState().addProjectile({
              id: Math.random().toString(),
              position: posVector.clone().add(rightOffset).add(tempDir.copy(throwDir).multiplyScalar(4)).toArray(),
              direction: throwDir.toArray(),
              damage: 80,
              color: '#ffaa00',
              isEnemy: true,
              speed: 30,
              gravity: true,
              size: 3,
              projType: 'bomb',
              createdAt: Date.now()
            });
          }
        } else if (type === 'swordsman') {
          // Melee attack specifically
          if (distToPlayer < 2.5) { // very close range
            const fireRate = 1200; // time between swings
            if (now - lastShot.current > fireRate) {
              lastShot.current = now;
              // Play hit sound
              audioManager.playPlayerHit();
              // Instantly deal damage to player
              takeDamage(25);
            }
          }
        } else {
          // Regular enemies
          const fireRate = type === 'spider' ? 2000 : type === 'retro-bot' ? 1000 : type === 'drone' ? 3000 : 1500;
          if (now - lastShot.current > fireRate + Math.random() * 500) {
             lastShot.current = now;
             audioManager.playEnemyShoot(type);
             useGameStore.getState().addProjectile({
               id: Math.random().toString(),
               position: posVector.clone().add(tempDir.copy(dirToPlayer).multiplyScalar(2)).toArray(),
               direction: dirToPlayer.toArray(),
               damage: type === 'retro-bot' ? 20 : 10,
               color: color,
               isEnemy: true,
               speed: type === 'spider' ? 35 : 25,
               createdAt: Date.now()
             });
          }
        }
      }
    }
  });

  if (removed) return null;

  return (
    <>
      <RigidBody 
        ref={ref} 
        colliders={false}
        type="dynamic" 
        gravityScale={0}
        friction={0}
        enabledRotations={[false, false, false]}
        position={position}
        userData={{ isEnemy: !dead, onHit: handleHit, id }}
      >
        {/* Sensor for huge easy hitboxes without causing physics issues against ground */}
        <BallCollider args={[type === 'boss' ? 8 : type === 'retro-bot' ? 3.5 : type === 'swordsman' ? 3 : 2.5]} sensor />
        {/* Physical collider centered at body position - Increased size to prevent clipping */}
        <BallCollider args={[type === 'boss' ? 5 : 1.2]} />
        {!dead && hovered && <EnemyHealthBar hp={hp} maxHp={maxHp} />}
        
        <group 
          ref={meshRef}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          scale={[0, 0, 0]}
        >
            {hitFlash && type !== 'boss' && (
              <mesh scale={[1.1, 1.1, 1.1]}>
                <sphereGeometry args={[1.5, 16, 16]} />
                <meshBasicMaterial color="#ff0000" transparent opacity={0.6} depthWrite={false} />
              </mesh>
            )}
            {type === 'drone' && <group position={[0, -1.2, 0]}><DroneModel color={color} /></group>}
            {type === 'spider' && <group position={[0, -1.2, 0]}><SpiderModel /></group>}
            {type === 'retro-bot' && <group position={[0, -1.2, 0]}><RetroBotModel /></group>}
            {type === 'boss' && <BossModel color={color} />}
            {type === 'swordsman' && <group position={[0, -1.2, 0]}><SwordsmanModel color={color} hp={hp} lastShot={lastShot} isDeadGlobal={isDeadGlobal} /></group>}
        </group>
      </RigidBody>
    </>
  );
}

const SwordsmanModel = React.memo(function SwordsmanModel({ color, hp, lastShot, isDeadGlobal }: { color: string, hp: number, lastShot: React.MutableRefObject<number>, isDeadGlobal: boolean }) {
  const paused = useGameStore(s => s.paused);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const swordRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  useFrame((state) => {
      if (paused) return;
      const time = state.clock.getElapsedTime();
      const now = performance.now();
      const timeSinceAttack = lastShot.current ? now - lastShot.current : 9999;
      const isAttacking = !isDeadGlobal && hp > 0 && timeSinceAttack < 600;

      let armRotX = Math.sin(time * 10) * 0.5;
      let armRotZ = 0;
      let swordRotX = Math.PI / 4;
      let bodyRotY = 0;

      if (isAttacking) {
          if (timeSinceAttack < 200) {
              const p = timeSinceAttack / 200;
              // Wind up: arm goes up, body twists right
              armRotX = -0.5 - p * 1.5; 
              armRotZ = p * 0.5; // pull arm out slightly
              bodyRotY = -p * 0.8;
              swordRotX = Math.PI / 4 + p * (Math.PI / 8);
          } else if (timeSinceAttack < 400) {
              const p = (timeSinceAttack - 200) / 200;
              // Swing: arm slashes down diagonally, body twists left
              armRotX = -2.0 + p * 4.0; // Swing down
              armRotZ = 0.5 - p * 1.0; // slash inwards
              bodyRotY = -0.8 + p * 1.6;
              swordRotX = Math.PI * 3/8 + p * (Math.PI / 2); // Arc forward
          } else {
              const p = (timeSinceAttack - 400) / 200;
              // Recover
              armRotX = 2.0 - p * 2.0;
              armRotZ = -0.5 + p * 0.5;
              bodyRotY = 0.8 - p * 0.8;
              swordRotX = Math.PI * 7/8 - p * (Math.PI * 5/8);
          }
      }

      const leftArmRot = -Math.sin(time * 10) * 0.5;
      const rightLegRot = Math.sin(time * 10) * 0.5;
      const leftLegRot = -Math.sin(time * 10) * 0.5;

      if (bodyRef.current) bodyRef.current.rotation.y = bodyRotY;
      if (rightArmRef.current) {
          rightArmRef.current.rotation.x = armRotX;
          rightArmRef.current.rotation.z = armRotZ;
      }
      if (swordRef.current) swordRef.current.rotation.x = swordRotX;
      if (leftArmRef.current) leftArmRef.current.rotation.x = leftArmRot;
      if (rightLegRef.current) rightLegRef.current.rotation.x = rightLegRot;
      if (leftLegRef.current) leftLegRef.current.rotation.x = leftLegRot;
  });

  return (
    <group scale={1.2}>
      <group ref={bodyRef}>
      {/* Body */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[0.5, 0.8, 0.3]} />
        <meshStandardMaterial color="#333" metalness={0.8} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#444" metalness={0.6} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0, 1.2, 0.21]}>
        <boxGeometry args={[0.3, 0.1, 0.05]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Right Arm (holds the sword) */}
      <group ref={rightArmRef} position={[0.35, 0.8, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.15, 0.6, 0.15]} />
          <meshStandardMaterial color="#444" metalness={0.6} />
        </mesh>
        
        {/* Sword Hand */}
        <group ref={swordRef} position={[0, -0.6, 0]}>
           {/* Sword Handle */}
           <mesh position={[0, -0.1, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.3]} />
              <meshStandardMaterial color="#111" />
           </mesh>
           {/* Sword Blade */}
           <mesh position={[0, -0.55, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.8]} />
              <meshBasicMaterial color={color} />
           </mesh>
           {/* Glow */}
           <mesh position={[0, -0.55, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.82]} />
              <meshBasicMaterial color={color} transparent opacity={0.4} />
           </mesh>
        </group>
      </group>

      {/* Left Arm */}
      <group ref={leftArmRef} position={[-0.35, 0.8, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.15, 0.6, 0.15]} />
          <meshStandardMaterial color="#444" metalness={0.6} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
           <sphereGeometry args={[0.1]} />
           <meshBasicMaterial color={color} />
        </mesh>
      </group>
      </group>

       {/* Right Leg */}
       <group ref={rightLegRef} position={[0.15, 0.3, 0]}>
          <mesh position={[0, -0.2, 0]}>
             <boxGeometry args={[0.15, 0.4, 0.15]} />
             <meshStandardMaterial color="#222" metalness={0.8} />
          </mesh>
       </group>

       {/* Left Leg */}
       <group ref={leftLegRef} position={[-0.15, 0.3, 0]}>
          <mesh position={[0, -0.2, 0]}>
             <boxGeometry args={[0.15, 0.4, 0.15]} />
             <meshStandardMaterial color="#222" metalness={0.8} />
          </mesh>
       </group>
    </group>
  );
});

const BossModel = React.memo(function BossModel({ color }: { color: string }) {
  const hullColor = "#845763"; // Purplish dark pink
  const accentColor = "#00ffcc"; // Cyan
  const darkColor = "#332228"; // Dark panel gaps

  return (
    <group scale={5} position={[0, 3.5, 0]}>
      {/* Central Hull */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.5, 0.6, 1.2]} />
        <meshStandardMaterial color={hullColor} metalness={0.6} roughness={0.7} />
      </mesh>
      
      {/* Cyan Cockpit / Nose */}
      <mesh position={[0, -0.1, 0.8]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 0.6, 6]} />
         <meshBasicMaterial color={accentColor} />
      </mesh>
      
      <mesh position={[0, -0.1, 1.1]} rotation={[Math.PI/2, 0, 0]}>
        <coneGeometry args={[0.2, 0.4, 6]} />
         <meshBasicMaterial color={accentColor} />
      </mesh>

      {/* Heavy Front Thrusters / Intake block */}
      {/* Left */}
      <group position={[-0.7, 0, 0.4]}>
        <mesh>
          <boxGeometry args={[0.6, 0.7, 1.0]} />
          <meshStandardMaterial color={hullColor} />
        </mesh>
        <mesh position={[0, 0, 0.51]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 6]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
      
      {/* Right */}
      <group position={[0.7, 0, 0.4]}>
        <mesh>
          <boxGeometry args={[0.6, 0.7, 1.0]} />
          <meshStandardMaterial color={hullColor} />
        </mesh>
        <mesh position={[0, 0, 0.51]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.1, 6]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>

      {/* Main Wings */}
      <mesh position={[-1.5, 0, -0.2]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[1.8, 0.4, 1.2]} />
        <meshStandardMaterial color={hullColor} />
      </mesh>
      <mesh position={[1.5, 0, -0.2]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[1.8, 0.4, 1.2]} />
        <meshStandardMaterial color={hullColor} />
      </mesh>
      
      {/* Wing Tips (swept further back) */}
      <mesh position={[-2.4, -0.1, -0.6]} rotation={[0, -0.6, 0]}>
        <boxGeometry args={[1.2, 0.2, 1.4]} />
        <meshStandardMaterial color={hullColor} />
      </mesh>
      <mesh position={[2.4, -0.1, -0.6]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[1.2, 0.2, 1.4]} />
        <meshStandardMaterial color={hullColor} />
      </mesh>

      {/* Back tails */}
      <mesh position={[-0.5, 0, -0.8]} rotation={[0, 0.1, 0]}>
         <boxGeometry args={[0.4, 0.5, 1.0]} />
         <meshStandardMaterial color={hullColor} />
      </mesh>
      <mesh position={[0.5, 0, -0.8]} rotation={[0, -0.1, 0]}>
         <boxGeometry args={[0.4, 0.5, 1.0]} />
         <meshStandardMaterial color={hullColor} />
      </mesh>

      {/* Cyan accents/lines using thin boxes */}
      <mesh position={[-0.8, 0.36, 0.3]}>
        <boxGeometry args={[0.4, 0.05, 0.1]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[0.8, 0.36, 0.3]}>
        <boxGeometry args={[0.4, 0.05, 0.1]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      
      <mesh position={[-1.2, 0.21, -0.2]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.1]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
      <mesh position={[1.2, 0.21, -0.2]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.05, 0.1]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>
    </group>
  );
});

const DroneModel = React.memo(function DroneModel({ color }: { color: string }) {
  // Reference 1: Orange bot with big glowing eye, sci-fi panels, 3 dangling legs
  return (
    <group>
      <group position={[0,0.5,0]}>
        {/* Main Body Sphere */}
        <mesh>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshStandardMaterial color="#ff8833" metalness={0.4} roughness={0.6} /> {/* Bright Orange */}
        </mesh>
        
        {/* White glowing ring around body */}
        <mesh rotation={[Math.PI / 4, 0, 0]}>
          <torusGeometry args={[0.72, 0.05, 8, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Head / Eye Block */}
        <mesh position={[0, 0.8, 0.3]}>
           <boxGeometry args={[0.5, 0.4, 0.5]} />
           <meshStandardMaterial color="#ff8833" roughness={0.7} />
        </mesh>
        
        <mesh position={[0, 0.8, 0.56]} rotation={[Math.PI/2,0,0]}>
           <cylinderGeometry args={[0.15, 0.2, 0.1, 16]} />
           <meshBasicMaterial color={color} />
        </mesh>

        {/* Antenna / wires on top */}
        <mesh position={[0.1, 1.1, 0.3]} rotation={[0,0,0.2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.4]} />
            <meshStandardMaterial color="#888" />
        </mesh>
        <mesh position={[-0.1, 1.1, 0.3]} rotation={[0.4,0,-0.2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3]} />
            <meshStandardMaterial color="#aaa" />
        </mesh>

        {/* Three Dangling Legs */}
        {[0, Math.PI * 2/3, Math.PI * 4/3].map((ang, i) => (
          <group key={i} rotation={[0, ang, 0]}>
             <group position={[0, -0.6, 0.6]} rotation={[-0.8, 0, 0]}>
                 <mesh position={[0, -0.4, 0]}>
                     <boxGeometry args={[0.1, 0.8, 0.1]} />
                     <meshStandardMaterial color="#c7621c" metalness={0.8} />
                 </mesh>
                 <mesh position={[0, -0.85, 0.1]} rotation={[0.4,0,0]}>
                     <coneGeometry args={[0.08, 0.5, 4]} />
                     <meshStandardMaterial color="#555" />
                 </mesh>
             </group>
          </group>
        ))}
      </group>
    </group>
  );
});

const SpiderModel = React.memo(function SpiderModel() {
  // Reference 2: Fleshy, jagged low-poly spider monster
  return (
    <group scale={1.2}>
      {/* Spider Legs container for animation */}
      <group>
        {/* 4 Legs Left */}
        {[...Array(4)].map((_, i) => (
            <group key={`l-${i}`} position={[-0.4, 0, -0.6 + i * 0.4]} rotation={[0, -0.2 + i * 0.1, 0.5]}>
                <mesh position={[-0.6, 0.4, 0]} rotation={[0, 0, 0.5]}>
                    <coneGeometry args={[0.15, 1.2, 4]} />
                    <meshStandardMaterial color="#aa3333" roughness={0.7} />
                </mesh>
                <mesh position={[-1.2, -0.2, 0]} rotation={[0, 0, -0.8]}>
                    <coneGeometry args={[0.1, 1.4, 4]} />
                    <meshStandardMaterial color="#882222" roughness={0.7} />
                </mesh>
            </group>
        ))}
        {/* 4 Legs Right */}
        {[...Array(4)].map((_, i) => (
            <group key={`r-${i}`} position={[0.4, 0, -0.6 + i * 0.4]} rotation={[0, 0.2 - i * 0.1, -0.5]}>
                <mesh position={[0.6, 0.4, 0]} rotation={[0, 0, -0.5]}>
                    <coneGeometry args={[0.15, 1.2, 4]} />
                    <meshStandardMaterial color="#aa3333" roughness={0.7} />
                </mesh>
                <mesh position={[1.2, -0.2, 0]} rotation={[0, 0, 0.8]}>
                    <coneGeometry args={[0.1, 1.4, 4]} />
                    <meshStandardMaterial color="#882222" roughness={0.7} />
                </mesh>
            </group>
        ))}
      </group>
      
      {/* Spider Body Low Poly */}
      <mesh position={[0, 0.3, -0.2]}>
          <octahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color="#cc4444" roughness={0.6} />
      </mesh>
      
      {/* Spider Head/Jaws */}
      <mesh position={[0, 0.2, 0.5]} rotation={[Math.PI/2, 0, 0]}>
          <coneGeometry args={[0.4, 0.8, 4]} />
          <meshStandardMaterial color="#ee3333" />
      </mesh>
      
      {/* Red Eyes */}
      <mesh position={[-0.15, 0.4, 0.8]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.15, 0.4, 0.8]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="#ff0000" />
      </mesh>
    </group>
  );
});

const RetroBotModel = React.memo(function RetroBotModel() {
  // Reference 3: Silver metallic 3D bot, antenna, 4 arms, thick base
  return (
    <group scale={1.2}>
      {/* Legs / Base */}
      <group position={[0, -0.8, 0]}>
         <mesh position={[0, 0.3, 0]}>
             <cylinderGeometry args={[0.4, 0.6, 0.6, 8]} />
             <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.3} />
         </mesh>
         {/* Simple track/foot shapes */}
         {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((ang, i) => (
             <mesh key={i} position={[Math.cos(ang)*0.4, 0.1, Math.sin(ang)*0.4]} rotation={[0, -ang, 0]}>
                 <boxGeometry args={[0.3, 0.2, 0.5]} />
                 <meshStandardMaterial color="#888" metalness={0.8} />
             </mesh>
         ))}
      </group>
      
      {/* Torso */}
      <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.6, 8]} />
          <meshStandardMaterial color="#888" metalness={0.9} />
      </mesh>
      
      {/* Arm block */}
      <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.8, 0.3, 0.8]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 4 Arms protruding */}
      {[0, Math.PI/2, Math.PI, Math.PI*1.5].map((ang, i) => (
          <group key={i} position={[Math.cos(ang)*0.4, 0.2, Math.sin(ang)*0.4]} rotation={[0, -ang, 0]}>
              <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI/2]}>
                  <cylinderGeometry args={[0.08, 0.08, 1.2]} />
                  <meshStandardMaterial color="#888" metalness={0.8} />
              </mesh>
              {/* Joint bulges */}
              <mesh position={[0.3, 0, 0]}>
                  <sphereGeometry args={[0.12]} />
                  <meshStandardMaterial color="#c0c0c0" metalness={1} />
              </mesh>
              <mesh position={[1.0, 0, 0]}>
                  <sphereGeometry args={[0.12]} />
                  <meshStandardMaterial color="#c0c0c0" metalness={1} />
              </mesh>
              {/* Laser tip */}
              <mesh position={[1.25, 0, 0]} rotation={[0,0,Math.PI/2]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.2]} />
                  <meshBasicMaterial color="#ff0000" />
              </mesh>
          </group>
      ))}

      {/* Neck */}
      <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.4]} />
          <meshStandardMaterial color="#555" metalness={0.8} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color="#d0d0d0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Eyes / Sensors */}
      <mesh position={[0, 0.9, 0.3]}>
          <boxGeometry args={[0.4, 0.15, 0.15]} />
          <meshStandardMaterial color="#800" />
      </mesh>
      <mesh position={[0, 0.9, 0.35]}>
          <boxGeometry args={[0.3, 0.08, 0.1]} />
          <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Top Antenna */}
      <mesh position={[0, 1.35, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.3]} />
          <meshStandardMaterial color="#888" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial color="#00ff00" />
      </mesh>

    </group>
  );
});

const EnemyHealthBar = React.memo(function EnemyHealthBar({ hp, maxHp }: { hp: number, maxHp: number }) {
  const percent = Math.max(0, hp / maxHp);
  return (
    <Billboard position={[0, 2.5, 0]} follow={true}>
      <mesh position={[0, 0, 0]} renderOrder={9998}>
        <planeGeometry args={[2, 0.2]} />
        <meshBasicMaterial color="#222" depthTest={false} depthWrite={false} transparent={true} />
      </mesh>
      <mesh position={[-(2 - 2 * percent) / 2, 0, 0.01]} renderOrder={9999}>
        <planeGeometry args={[2 * percent, 0.2]} />
        <meshBasicMaterial color={percent > 0.5 ? '#00ff00' : percent > 0.25 ? '#ffff00' : '#ff0000'} depthTest={false} depthWrite={false} transparent={true} />
      </mesh>
    </Billboard>
  );
});


