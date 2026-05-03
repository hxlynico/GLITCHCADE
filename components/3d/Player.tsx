'use client';

import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier, RapierRigidBody } from '@react-three/rapier';
import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Controls } from './GameControls';
import { useKeyboardControls } from '@react-three/drei';
import { useGameStore } from '@/store/gameStore';
import { audioManager } from '@/lib/audioManager';

const SPEED = 8.5;
const SPRINT_SPEED = 12;
const JUMP_FORCE = 6;

export function Player() {
  const playerRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();
  const { rapier, world } = useRapier();
  
  const equipWeapon = useGameStore(s => s.equipWeapon);
  const currentWeapon = useGameStore(s => s.inventory[s.currentWeaponIndex]);
  const isDead = useGameStore(s => s.isDead);
  const paused = useGameStore(s => s.paused);
  const isReloading = useGameStore(s => s.isReloading);

  // Weapon switching and Reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (paused || useGameStore.getState().isReloading) return;
      if (e.code === 'Digit1') { equipWeapon(0); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit2') { equipWeapon(1); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit3') { equipWeapon(2); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit4') { equipWeapon(3); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit5') { equipWeapon(4); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit6') { equipWeapon(5); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit7') { equipWeapon(6); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit8') { equipWeapon(7); audioManager.playWeaponSwitch(); }
      if (e.code === 'Digit9') { equipWeapon(8); audioManager.playWeaponSwitch(); }

      if (e.code === 'KeyR' || e.key === 'r') {
        const state = useGameStore.getState();
        const curWeapon = state.inventory[state.currentWeaponIndex];
        if (state.isReloading || isDead || !curWeapon || curWeapon.magazineSize === Infinity) return;

        const curLoaded = state.loadedAmmo[curWeapon.id] || 0;
        const curReserve = state.ammo[curWeapon.id] || 0;

        if (curLoaded < curWeapon.magazineSize && curReserve > 0) {
          state.setReloading(true);
          audioManager.playReload();
          setTimeout(() => {
             // Re-evaluate state after timeout
             const finalState = useGameStore.getState();
             const nowWeapon = finalState.inventory[finalState.currentWeaponIndex];
             if (nowWeapon && nowWeapon.id === curWeapon.id) {
               finalState.reloadWeapon(curWeapon.id);
             }
             useGameStore.getState().setReloading(false);
          }, curWeapon.reloadTime);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (isDead || paused || useGameStore.getState().isReloading) return;
      const { inventory, currentWeaponIndex } = useGameStore.getState();
      if (e.deltaY > 0) {
         equipWeapon((currentWeaponIndex + 1) % inventory.length);
         audioManager.playWeaponSwitch();
      } else if (e.deltaY < 0) {
         equipWeapon((currentWeaponIndex - 1 + inventory.length) % inventory.length);
         audioManager.playWeaponSwitch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    }
  }, [equipWeapon, isDead, paused]);

  // Shooting mechanic
  const lastShot = useRef(0);
  const [lasers, setLasers] = useState<{id: number, pos: THREE.Vector3, dir: THREE.Vector3, color: string}[]>([]);

  useEffect(() => {
    const handleMouseClick = (e: MouseEvent) => {
      if (!document.pointerLockElement || isDead || paused) return;
      if (e.button !== 0) return; // Left click only

      const now = performance.now();
      if (!currentWeapon || now - lastShot.current < currentWeapon.fireRate) return;
      
      const state = useGameStore.getState();
      if (state.isReloading) return; // Cannot fire while reloading

      if (!state.consumeAmmo(currentWeapon.id)) {
        const curReserve = state.ammo[currentWeapon.id] || 0;
        if (curReserve > 0) {
          state.setReloading(true);
          audioManager.playReload();
          setTimeout(() => {
             const finalState = useGameStore.getState();
             const nowWeapon = finalState.inventory[finalState.currentWeaponIndex];
             if (nowWeapon && nowWeapon.id === currentWeapon.id) {
               finalState.reloadWeapon(currentWeapon.id);
             }
             useGameStore.getState().setReloading(false);
          }, currentWeapon.reloadTime);
        }
        return; // Out of ammo, started reload
      }

      // Start auto-reload if clip is now empty after this shot
      const postState = useGameStore.getState();
      if ((postState.loadedAmmo[currentWeapon.id] || 0) === 0 && (postState.ammo[currentWeapon.id] || 0) > 0) {
          postState.setReloading(true);
          audioManager.playReload();
          setTimeout(() => {
             const finalState = useGameStore.getState();
             const nowWeapon = finalState.inventory[finalState.currentWeaponIndex];
             if (nowWeapon && nowWeapon.id === currentWeapon.id) {
               finalState.reloadWeapon(currentWeapon.id);
             }
             useGameStore.getState().setReloading(false);
          }, currentWeapon.reloadTime);
      }

      lastShot.current = now;
      
      // Play sound
      audioManager.playShoot(currentWeapon.id);

      // Fire projectile
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

      if (currentWeapon.type === 'melee') {
        const throwDir = raycaster.ray.direction.clone().normalize();
        useGameStore.getState().addProjectile({
          id: Math.random().toString(),
          position: camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(1.5)).toArray(),
          direction: throwDir.toArray(),
          damage: currentWeapon.damage,
          color: currentWeapon.color,
          isEnemy: false,
          speed: 0,
          size: 8.0,
          projType: 'melee',
          createdAt: Date.now()
        });
        
        // Visual swing state
        setLasers([{ id: Math.random(), pos: new THREE.Vector3(), dir: new THREE.Vector3(), color: currentWeapon.color }]);
        setTimeout(() => setLasers([]), 250); // longer swing animation
      } else if (currentWeapon.type === 'shotgun') {
        const numPellets = 5;
        for (let i = 0; i < numPellets; i++) {
          const spreadX = (Math.random() - 0.5) * 0.15;
          const spreadY = (Math.random() - 0.5) * 0.15;
          const pDir = raycaster.ray.direction.clone().add(new THREE.Vector3(spreadX, spreadY, 0)).normalize();
          useGameStore.getState().addProjectile({
            id: Math.random().toString(),
            position: camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(1)).toArray(),
            direction: pDir.toArray(),
            damage: currentWeapon.damage,
            color: currentWeapon.color,
            isEnemy: false,
            speed: 80,
            size: 0.2,
            createdAt: Date.now()
          });
        }
      } else if (currentWeapon.type === 'heavy') {
        const throwDir = raycaster.ray.direction.clone().add(new THREE.Vector3(0, 0.2, 0)).normalize();
        useGameStore.getState().addProjectile({
          id: Math.random().toString(),
          position: camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(1)).toArray(),
          direction: throwDir.toArray(),
          damage: currentWeapon.damage,
          color: currentWeapon.color,
          isEnemy: false,
          speed: 40,
          gravity: true,
          size: 2,
          projType: 'bomb',
          createdAt: Date.now()
        });
      } else {
        useGameStore.getState().addProjectile({
          id: Math.random().toString(),
          position: camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(1)).toArray(),
          direction: raycaster.ray.direction.toArray(),
          damage: currentWeapon.damage,
          color: currentWeapon.color,
          isEnemy: false,
          speed: currentWeapon.type === 'sniper' ? 150 : 80,
          size: currentWeapon.type === 'sniper' ? 0.8 : (currentWeapon.type === 'smg' ? 0.3 : 0.5),
          createdAt: Date.now()
        });
      }
        
        if (currentWeapon.type !== 'melee') {
          // Muzzle flash visual trigger
          setLasers([{ id: Math.random(), pos: new THREE.Vector3(), dir: new THREE.Vector3(), color: currentWeapon.color }]);
          setTimeout(() => setLasers([]), 100);
        }
    };

    document.addEventListener('mousedown', handleMouseClick);
    return () => document.removeEventListener('mousedown', handleMouseClick);
  }, [camera, rapier, world, currentWeapon, isDead, paused]);

  // Movement state
  const currentSpeedRef = useRef(SPEED);
  
  // Pre-allocate vectors to avoid GC overhead in useFrame
  const frontVector = useMemo(() => new THREE.Vector3(), []);
  const sideVector = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!playerRef.current || isDead || paused) return;

    const keys = getKeys();
    
    // Movement logic
    const velocity = playerRef.current.linvel();
    const pos = playerRef.current.translation();
    
    // Update camera position safely without mutation errors
    state.camera.position.set(pos.x, pos.y + 0.8, pos.z);

    frontVector.set(0, 0, (keys.back ? 1 : 0) - (keys.forward ? 1 : 0));
    sideVector.set((keys.left ? 1 : 0) - (keys.right ? 1 : 0), 0, 0);
    
    // Check if moving
    const isMoving = (keys.forward || keys.back || keys.left || keys.right) && frontVector.lengthSq() + sideVector.lengthSq() > 0;
    
    // Smooth stamina and sprint management
    let targetSpeed = SPEED;

    // Check Ground
    const ray = new rapier.Ray(pos, { x: 0, y: -1, z: 0 });
    const groundHit = world.castRay(ray, 1.5, true);
    const isGrounded = groundHit && groundHit.timeOfImpact < 1.1;

    // Jumping
    if (keys.jump && isGrounded) {
      playerRef.current.setLinvel({ x: velocity.x, y: JUMP_FORCE, z: velocity.z }, true);
    }

    if (keys.sprint && isMoving && isGrounded) {
        targetSpeed = SPRINT_SPEED;
    }

    // Smooth speed transition
    currentSpeedRef.current = THREE.MathUtils.lerp(currentSpeedRef.current, targetSpeed, 10 * delta);

    // Apply rotation and clamp
    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(currentSpeedRef.current).applyEuler(state.camera.rotation);

    // Apply movement (keep current Y velocity for gravity/jumping, but the jump check might have changed it previously so we read from updated linvel)
    const currentRbVel = playerRef.current.linvel();
    playerRef.current.setLinvel({ x: direction.x, y: currentRbVel.y, z: direction.z }, true);
  });

  return (
    <>
      <RigidBody
        ref={playerRef}
        name="player"
        userData={{ isPlayer: true, name: 'player' }}
        colliders={false}
        mass={1}
        position={[0, 5, 0]}
        enabledRotations={[false, false, false]}
        type="dynamic"
      >
        <CapsuleCollider args={[0.5, 0.5]} />
      </RigidBody>

      {/* Render First Person Weapon */}
      {!isDead && currentWeapon && (
        <WeaponModel weapon={currentWeapon} isFiring={lasers.length > 0} isReloading={isReloading} />
      )}
    </>
  );
}

function WeaponModel({ weapon, isFiring, isReloading }: { weapon: any, isFiring: boolean, isReloading: boolean }) {
  const group = useRef<THREE.Group>(null);
  const recoilOffset = useRef(0);
  const [, getKeys] = useKeyboardControls();
  const paused = useGameStore(s => s.paused);

  // Generate procedural textures for the weapons to satisfy the "texture library" request
  const [materials] = useState(() => {
    const createMap = (drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) drawFn(ctx);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      return tex;
    };

    const diffuse = createMap((ctx) => {
      // Carbon fiber / Sci-fi hex pattern base
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, 512, 512);

      // Noise / Wear and tear
      for (let i = 0; i < 8000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#222' : '#0a0a0a';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 4, Math.random() * 4);
      }
      
      // Panel lines
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 4;
      for (let i = 0; i < 512; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
      }
      
      // Scratches along edges / body
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      for (let i = 0; i < 1000; i++) {
         const x = Math.random() * 512;
         const y = Math.random() * 512;
         ctx.beginPath();
         ctx.moveTo(x, y);
         ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
         ctx.stroke();
      }
    });

    const emissive = createMap((ctx) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 512, 512);
      
      // Glowing circuitry patterns
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = '#fff';
      ctx.lineWidth = 3;
      
      for(let i=0; i<40; i++) {
         let x = Math.floor(Math.random() * 16) * 32;
         let y = Math.floor(Math.random() * 16) * 32;
         ctx.beginPath();
         ctx.moveTo(x, y);
         for(let j=0; j<4; j++) {
           x += (Math.random() > 0.5 ? 1 : -1) * 64;
           y += (Math.random() > 0.5 ? 1 : -1) * 64;
           ctx.lineTo(x, y);
         }
         ctx.stroke();
         ctx.beginPath();
         ctx.arc(x, y, 6, 0, Math.PI*2);
         ctx.fill();
      }
    });

    const roughness = createMap((ctx) => {
      ctx.fillStyle = '#888';
      ctx.fillRect(0, 0, 512, 512);
      
      // Make panel lines rougher
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      for (let i = 0; i < 512; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
      }
      
      // Grunge
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 15, Math.random() * 15);
      }
    });

    return { map: diffuse, emissiveMap: emissive, roughnessMap: roughness };
  });

  // Different shapes depending on weapon type
  const isPistol = weapon.type === 'pistol';
  const isRifle = weapon.type === 'rifle';
  const isShotgun = weapon.type === 'shotgun';
  const isSniper = weapon.type === 'sniper';
  const isSmg = weapon.type === 'smg';
  const isHeavy = weapon.type === 'heavy';
  const isMelee = weapon.type === 'melee';

  const { camera, scene } = useThree();

  useEffect(() => {
    if (group.current) {
      const currentGroup = group.current;
      scene.add(camera);
      camera.add(currentGroup);
      return () => {
        camera.remove(currentGroup);
      };
    }
  }, [camera, scene]);

  const targetPos = useRef(new THREE.Vector3());
  const targetRot = useRef(new THREE.Euler());

  useFrame((state, delta) => {
    if (!group.current || paused) return;
    
    // Default position relative to the camera (bottom-right of screen)
    targetPos.current.set(0.4, -0.3, -0.6);
    targetRot.current.set(0, 0, 0);

    if (isMelee) {
      targetPos.current.set(0.6, -0.4, -0.5); // lower and more to the side
      targetRot.current.set(-0.5, 0.2, 0.4); // angled slightly away
    }

    const time = state.clock.getElapsedTime();
    const keys = getKeys();
    const isMoving = keys.forward || keys.back || keys.left || keys.right;
    
    // Weapon bobbing for breathing / moving
    if (isMoving) {
        // Run bobbing
        const speedMultiplier = keys.sprint ? 15 : 10;
        const bobAmount = keys.sprint ? 0.05 : 0.03;
        targetPos.current.y += Math.abs(Math.sin(time * speedMultiplier)) * bobAmount - 0.01;
        targetPos.current.x += Math.cos(time * speedMultiplier * 0.5) * bobAmount * 0.5;
        targetRot.current.z += Math.cos(time * speedMultiplier * 0.5) * bobAmount * 0.5;
    } else {
        // Gentle breathing bobbing
        targetPos.current.y += Math.sin(time * 2) * 0.005;
        targetPos.current.x += Math.cos(time * 1) * 0.005;
    }

    // Handle recoil or swing
    if (isReloading) {
      targetPos.current.y -= 0.3;
      targetPos.current.z -= 0.2;
      targetRot.current.x -= 1.0;
      targetRot.current.y -= 0.5;
      targetRot.current.z += Math.sin(time * 15) * 0.1; // shaking reload effect
    } else if (isFiring) {
      if (isMelee) {
        // Swing motion
        targetRot.current.x -= 1.5;
        targetRot.current.y += 1.0;
        targetRot.current.z -= 0.5;
        targetPos.current.x -= 0.4;
        targetPos.current.z -= 0.4;
        targetPos.current.y += 0.2;
        recoilOffset.current = THREE.MathUtils.lerp(recoilOffset.current, 1, 15 * delta);
      } else {
        recoilOffset.current = THREE.MathUtils.lerp(recoilOffset.current, 0.15, 15 * delta);
      }
    } else {
      recoilOffset.current = THREE.MathUtils.lerp(recoilOffset.current, 0, 10 * delta);
    }

    if (!isMelee && !isReloading) {
      targetPos.current.z += recoilOffset.current;
      targetPos.current.y += recoilOffset.current * 0.2; // slight upward kick
      targetRot.current.x += recoilOffset.current * 0.8; // rotational kick
    }

    // Smoothly interpolate to local offset target
    group.current.position.lerp(targetPos.current, 20 * delta);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetRot.current.x, 20 * delta);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRot.current.y, 20 * delta);
    group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, targetRot.current.z, 20 * delta);
  });

  const barrelLength = isSniper ? 1.0 : isHeavy ? 0.8 : isRifle ? 0.7 : isShotgun ? 0.6 : isSmg ? 0.3 : 0.4;
  const barrelThick = isHeavy ? 0.15 : 0.08;

  if (isMelee) {
    return (
      <group ref={group}>
        {/* Sword Handle */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 16]} />
          <meshStandardMaterial 
            color="#222" 
            map={materials.map}
            roughnessMap={materials.roughnessMap}
            metalness={0.8}
            depthTest={false}
          />
        </mesh>
        
        {/* Handle Guard */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
          <meshStandardMaterial color="#444" metalness={0.9} depthTest={false} />
        </mesh>

        {/* Laser Blade */}
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2, 16]} />
          <meshBasicMaterial 
            color={weapon.color} 
            transparent
            opacity={0.8}
            depthTest={false}
          />
        </mesh>
        
        {/* Outer Laser Glow */}
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 1.25, 16]} />
          <meshBasicMaterial 
            color={weapon.color} 
            transparent
            opacity={0.3}
            depthTest={false}
          />
        </mesh>

        {/* Swing Trail (only when swinging) */}
        {isFiring && (
          <pointLight position={[0, 0.5, 0]} color={weapon.color} intensity={2} distance={5} />
        )}
      </group>
    );
  }

  return (
    <group ref={group}>
      {/* Low Poly Weapon Body */}
      <mesh position={[0, -0.05, -barrelLength / 4]}>
        {/* Main upper barrel */}
        <boxGeometry args={[barrelThick, 0.1, barrelLength]} />
        <meshStandardMaterial 
          color="#222" 
          map={materials.map}
          emissiveMap={materials.emissiveMap}
          emissive={weapon.color}
          emissiveIntensity={1.5}
          roughnessMap={materials.roughnessMap}
          metalness={0.8} 
          depthTest={false} 
          transparent 
        />
      </mesh>
      
      {/* Neon Edges (Wireframe) */}
      <mesh position={[0, -0.05, -barrelLength / 4]}>
        <boxGeometry args={[barrelThick + 0.005, 0.105, barrelLength + 0.005]} />
        <meshBasicMaterial color={weapon.color} wireframe depthTest={false} transparent />
      </mesh>

      {/* Handle */}
      <mesh position={[0, -0.22, 0.1]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.06, 0.25, 0.1]} />
        <meshStandardMaterial 
          color="#222" 
          map={materials.map}
          emissiveMap={materials.emissiveMap}
          emissive={weapon.color}
          emissiveIntensity={1.5}
          roughnessMap={materials.roughnessMap}
          metalness={0.8} 
          depthTest={false} 
          transparent 
        />
      </mesh>

      {/* Handle Edges */}
      <mesh position={[0, -0.22, 0.1]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.065, 0.255, 0.105]} />
        <meshBasicMaterial color={weapon.color} wireframe depthTest={false} transparent />
      </mesh>

      {/* Detail pieces (like the front slope) */}
      <mesh position={[0, -0.15, -0.15]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.06, 0.1, 0.1]} />
        <meshStandardMaterial 
          color="#222" 
          map={materials.map}
          emissiveMap={materials.emissiveMap}
          emissive={weapon.color}
          emissiveIntensity={1.5}
          roughnessMap={materials.roughnessMap}
          metalness={0.8} 
          depthTest={false} 
          transparent 
        />
      </mesh>
      <mesh position={[0, -0.15, -0.15]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.065, 0.105, 0.105]} />
        <meshBasicMaterial color={weapon.color} wireframe depthTest={false} transparent />
      </mesh>

      {/* Back hammer area */}
      <mesh position={[0, -0.02, 0.2]}>
        <boxGeometry args={[0.08, 0.08, 0.1]} />
        <meshStandardMaterial 
          color="#222" 
          map={materials.map}
          emissiveMap={materials.emissiveMap}
          emissive={weapon.color}
          emissiveIntensity={1.5}
          roughnessMap={materials.roughnessMap}
          metalness={0.8} 
          depthTest={false} 
          transparent 
        />
      </mesh>
      <mesh position={[0, -0.02, 0.2]}>
        <boxGeometry args={[0.085, 0.085, 0.105]} />
        <meshBasicMaterial color={weapon.color} wireframe depthTest={false} transparent />
      </mesh>

      {/* Muzzle Flash when firing */}
      {isFiring && (
        <pointLight position={[0, 0, -0.3]} color={weapon.color} intensity={5} distance={10} />
      )}
      {isFiring && (
        <mesh position={[0, -0.05, -0.25]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshBasicMaterial color={weapon.color} transparent opacity={0.6} depthTest={false} />
        </mesh>
      )}
    </group>
  );
}
