'use client';

import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { PointerLockControls } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, Pixelation, Scanline } from '@react-three/postprocessing';
import { Suspense, useState, useEffect } from 'react';
import { BlendFunction } from 'postprocessing';

import { GameControls } from './GameControls';
import { Player } from './Player';
import { Environment } from './Environment';
import { Pickups } from './Pickups';
import { Enemies } from './Enemies';
import { ProjectilesManager } from './Projectiles';
import HUD from '../ui/HUD';
import { useGameStore } from '@/store/gameStore';
import { audioManager } from '@/lib/audioManager';

export default function Game() {
  const isDead = useGameStore(s => s.isDead);
  const paused = useGameStore(s => s.paused);
  const setPaused = useGameStore(s => s.setPaused);
  
  const started = useGameStore(s => s.started);
  const setStarted = useGameStore(s => s.setStarted);
  
  const [locked, setLocked] = useState(false);
  const [readyToLock, setReadyToLock] = useState(true);

  useEffect(() => {
    const startAudio = () => audioManager.startMusic();
    document.addEventListener('click', startAudio);
    document.addEventListener('keydown', startAudio);
    
    const handleLockError = () => {
      console.warn('Pointer lock error');
      setReadyToLock(false);
      setTimeout(() => setReadyToLock(true), 1500);
    };
    document.addEventListener('pointerlockerror', handleLockError);
    
    return () => {
      document.removeEventListener('click', startAudio);
      document.removeEventListener('keydown', startAudio);
      document.removeEventListener('pointerlockerror', handleLockError);
    };
  }, []);

  useEffect(() => {
    if (!locked && started && !isDead) {
      setTimeout(() => setReadyToLock(false), 0);
      const t = setTimeout(() => setReadyToLock(true), 1500);
      return () => clearTimeout(t);
    }
  }, [locked, started, isDead]);

  // Handle death state
  useEffect(() => {
    if (isDead) {
      audioManager.stopAll();
      try {
        if (document.pointerLockElement) document.exitPointerLock();
      } catch (e) {}
      setTimeout(() => setLocked(false), 0);
    }
  }, [isDead]);

  const resetCounter = useGameStore(s => s.resetCounter);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative font-sans">
      {!locked && !isDead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0514]/90 backdrop-blur-md z-50 font-sans">
          {/* Decorative Tech Background */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#ff003c]/20 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#00f0ff]/20 to-transparent"></div>
          
          {/* Cyberpunk Title */}
          <div className="relative mb-12">
            <h1 className="text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#ff003c] drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] font-[family-name:var(--font-orbitron)] relative z-10" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.5)' }}>GLITCHCADE</h1>
            {/* Glitch layers */}
            <h1 className="absolute top-0 left-[6px] text-9xl font-black italic tracking-tighter text-[#ff003c] mix-blend-screen opacity-70 font-[family-name:var(--font-orbitron)] select-none">GLITCHCADE</h1>
            <h1 className="absolute top-0 -left-[6px] text-9xl font-black italic tracking-tighter text-[#00f0ff] mix-blend-screen opacity-70 font-[family-name:var(--font-orbitron)] select-none">GLITCHCADE</h1>
            <div className="h-1 w-full mt-6 bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_15px_#00f0ff]"></div>
          </div>

          <p className="text-[#00f0ff] text-xl uppercase tracking-[0.4em] font-[family-name:var(--font-rajdhani)] font-medium mb-10 drop-shadow-[0_0_8px_#00f0ff]">by Calmusche Cristian-Nicolae</p>

          {/* Controls Table */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-10 text-sm font-[family-name:var(--font-rajdhani)] text-[#00f0ff] bg-black/40 border border-[#00f0ff]/30 p-6 rounded-sm shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-white tracking-widest">WASD</span>
              <span className="opacity-80">WALK</span>
            </div>
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-white tracking-widest text-right">MOVE MOUSE</span>
              <span className="opacity-80 text-right">LOOK AROUND</span>
            </div>
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-white tracking-widest">SHIFT</span>
              <span className="opacity-80">SPRINT</span>
            </div>
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-white tracking-widest text-right">L-CLICK</span>
              <span className="opacity-80 text-right">SHOOT</span>
            </div>
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-white tracking-widest">SPACE</span>
              <span className="opacity-80">JUMP</span>
            </div>
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-white tracking-widest text-right">R</span>
              <span className="opacity-80 text-right">RELOAD</span>
            </div>
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-[#ff003c] tracking-widest drop-shadow-[0_0_5px_#ff003c]">HOLD SPACE</span>
              <span className="opacity-80">FLY</span>
            </div>
            <div className="flex justify-between border-b border-[#00f0ff]/20 pb-1">
              <span className="font-bold text-white tracking-widest text-right">1-5</span>
              <span className="opacity-80 text-right">WEAPONS</span>
            </div>
          </div>

          <button 
            id="play-btn" 
            disabled={!readyToLock}
            onMouseEnter={() => audioManager.playUIHover()}
            onClick={() => audioManager.playUIClick()}
            className={`relative group overflow-hidden px-16 py-5 bg-black/50 border border-[#00f0ff]/50 font-bold uppercase tracking-[0.2em] transition-all 
            ${readyToLock ? 'text-[#00f0ff] hover:bg-[#00f0ff]/20 hover:border-[#00f0ff] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] cursor-pointer' : 'text-gray-500 border-gray-600 cursor-not-allowed'}`}
          >
            <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${readyToLock ? 'border-[#00f0ff]' : 'border-gray-500'}`}></div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${readyToLock ? 'border-[#00f0ff]' : 'border-gray-500'}`}></div>
            <span className={`relative z-10 font-[family-name:var(--font-orbitron)] text-lg transition-colors duration-300 ${readyToLock ? 'group-hover:text-white' : 'text-gray-500'}`}>
              {readyToLock ? 'Enter' : 'Loading...'}
            </span>
          </button>
        </div>
      )}

      {started && <HUD />}

      <GameControls>
        <Canvas camera={{ fov: 75 }}>
          <Suspense fallback={null}>
            <Physics key={resetCounter} gravity={[0, -20, 0]} paused={paused || isDead || !locked}>
              <Environment />
              <Player />
              <Pickups />
              <Enemies />
              <ProjectilesManager />
            </Physics>

            {!isDead && (
              <PointerLockControls 
                makeDefault
                selector="#play-btn"
                onLock={() => {
                  if (!started) {
                    setStarted(true);
                    audioManager.startMusic();
                  }
                  setLocked(true);
                  setPaused(false);
                  audioManager.resumeMusic();
                }}
                onUnlock={() => {
                  setLocked(false);
                  setPaused(true);
                  audioManager.pauseMusic();
                }}
              />
            )}

            {/* Vaporware Bloom & Effects */}
              <EffectComposer multisampling={0}>
                <Pixelation granularity={2} />
                <Bloom luminanceThreshold={0.5} mipmapBlur intensity={0.25} />
                <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={[0.0015, 0.0015] as any} />
                <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.15} />
                <Scanline blendFunction={BlendFunction.OVERLAY} density={1.0} opacity={0.15} />
                <Vignette eskil={false} offset={0.1} darkness={0.9} blendFunction={BlendFunction.NORMAL} />
              </EffectComposer>
            </Suspense>
          </Canvas>
        </GameControls>

      {/* Retro VHS / CRT Overlay & TV Tube Edge */}
      <div className="pointer-events-none absolute inset-0 z-[100]" style={{
        background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.1) 50%), linear-gradient(90deg, rgba(255,0,0,0.03), rgba(0,255,0,0.01), rgba(0,0,255,0.03))',
        backgroundSize: '100% 4px, 6px 100%',
        boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.4)',
        opacity: 0.15,
        mixBlendMode: 'overlay'
      }}></div>
      
      {/* Screen Flicker / Tube Pulse */}
      <div className="pointer-events-none absolute inset-0 z-[101] bg-white opacity-0 animate-[pulse_4s_ease-in-out_infinite] mix-blend-overlay"></div>
    </div>
  );
}
