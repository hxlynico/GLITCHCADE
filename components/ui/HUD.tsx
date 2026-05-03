'use client';

import { useGameStore } from '@/store/gameStore';
import { audioManager } from '@/lib/audioManager';

import { useShallow } from 'zustand/react/shallow';
import { useEffect } from 'react';

export default function HUD() {
  const { hp, maxHp, isDead, inventory, currentWeaponIndex, ammo, loadedAmmo, isReloading, score } = useGameStore(useShallow(s => ({
    hp: s.hp, maxHp: s.maxHp, isDead: s.isDead, inventory: s.inventory, currentWeaponIndex: s.currentWeaponIndex, ammo: s.ammo, loadedAmmo: s.loadedAmmo, isReloading: s.isReloading, score: s.score
  })));

  useEffect(() => {
    if (isDead) {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    }
  }, [isDead]);

  if (isDead) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0514]/90 backdrop-blur-xl text-white z-50 pointer-events-auto font-[family-name:var(--font-rajdhani)]">
        {/* Abstract sci-fi background lines */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#ff003c 1px, transparent 1px), linear-gradient(90deg, #ff003c 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div className="relative bg-black/80 border border-[#ff003c]/40 p-16 flex flex-col items-center shadow-[0_0_50px_rgba(255,0,60,0.3)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
          {/* Tech Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#ff003c] -translate-x-1 -translate-y-1"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#ff003c] translate-x-1 translate-y-1"></div>

          <h1 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff003c] to-[#ff6600] mb-2 tracking-[0.2em] uppercase font-[family-name:var(--font-orbitron)] drop-shadow-[0_0_10px_rgba(255,0,60,0.8)]">GAME OVER</h1>
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#ff003c] to-transparent my-6"></div>
          
          <div className="flex items-end gap-4 mt-2">
            <span className="text-2xl text-white/50 tracking-[0.2em] uppercase">Final Score //</span>
            <span className="text-5xl text-[#00f0ff] font-bold font-[family-name:var(--font-orbitron)] drop-shadow-[0_0_12px_#00f0ff]">{score.toString().padStart(6, '0')}</span>
          </div>

          <button
            onClick={() => {
              audioManager.playUIClick();
              useGameStore.getState().resetGame();
            }}
            onMouseEnter={() => audioManager.playUIHover()}
            className="group relative mt-16 px-12 py-4 bg-[#ff003c]/10 border border-[#ff003c]/50 hover:bg-[#ff003c]/30 hover:border-[#ff003c] transition-all cursor-pointer overflow-hidden" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
          >
            <div className="absolute inset-0 bg-[#ff003c] w-0 group-hover:w-full transition-all duration-300 opacity-20"></div>
            <span className="relative z-10 text-[#ff003c] group-hover:text-white font-bold uppercase tracking-[0.3em] font-[family-name:var(--font-orbitron)] transition-colors">Reboot Sequence</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-[family-name:var(--font-rajdhani)] select-none text-white overflow-hidden">
      
      {/* Sci-fi Overlay Border */}
      <div className="absolute inset-0 border-[1px] border-[#00f0ff]/10 m-4 rounded-sm pointer-events-none">
        {/* Target Reticles on corners */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00f0ff]/40"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00f0ff]/40"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00f0ff]/40"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00f0ff]/40"></div>
      </div>

      {/* Top Left: Score Box */}
      <div className="absolute top-8 left-8 z-20 flex flex-col bg-black/40 backdrop-blur-md border border-[#00f0ff]/30 p-4 shadow-[0_0_20px_rgba(0,240,255,0.1)]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)' }}>
        <div className="text-sm mb-1 uppercase tracking-[0.3em] text-[#00f0ff]/70 font-semibold">Score Data</div>
        <div className="text-4xl text-[#00f0ff] font-bold font-[family-name:var(--font-orbitron)] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] leading-none">{score.toString().padStart(6, '0')}</div>
        <div className="absolute top-0 right-0 w-2 h-full bg-[#00f0ff]/20"></div>
      </div>
      
      {/* Top Right: System Info */}
      <div className="absolute top-8 right-8 flex flex-col items-end text-sm font-semibold tracking-widest text-[#00f0ff]/40 z-20">
        <div>SYS.VER // 0.3.4</div>
        <div>OP.MODE // LIVE</div>
        <div className="w-16 h-[1px] bg-[#00f0ff]/40 mt-2"></div>
      </div>

      {/* Bottom Center: Health Bar & Inventory */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6 z-20 w-full max-w-xl">
        
        {/* Inventory Row */}
        <div className="flex items-center gap-4">
          {inventory.map((weapon, index) => {
             const isActive = index === currentWeaponIndex;
             return (
               <div 
                 key={weapon.id} 
                 className={`relative flex items-center justify-center w-20 h-16 transition-all bg-black/60 backdrop-blur-md border border-[#00f0ff]/20 ${
                   isActive ? 'scale-110 border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.5)] z-10' : 'opacity-60'
                 }`}
                 style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
               >
                 {isActive && <div className="absolute inset-0 bg-[#00f0ff]/10"></div>}
                 <span className="absolute top-1 left-2 text-[10px] font-bold text-[#00f0ff]/50">0{index + 1}</span>
                 <span className="text-lg font-bold tracking-widest font-[family-name:var(--font-orbitron)]" style={{ color: isActive ? '#00f0ff' : '#fff', textShadow: isActive ? '0 0 8px #00f0ff' : 'none' }}>
                    {weapon.name.substring(0, 3).toUpperCase()}
                 </span>
               </div>
             )
          })}
        </div>

        {/* Cyberpunk Health Bar */}
        <div className="w-full flex items-center gap-4 bg-black/50 p-3 backdrop-blur-md border border-[#ff003c]/30 shadow-[0_0_20px_rgba(255,0,60,0.1)]" style={{ clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)' }}>
          <div className="text-[#ff003c] font-bold tracking-[0.2em] ml-4 text-sm">INTEGRITY</div>
          <div className="flex-1 h-3 bg-black/80 relative overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff003c] to-[#ff6600] transition-all duration-300"
              style={{ width: `${(hp / maxHp) * 100}%` }}
            >
              {/* Pattern inside health bar */}
              <div className="w-full h-full opacity-30" style={{ backgroundImage: 'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.5) 50%)', backgroundSize: '10px 10px' }}></div>
            </div>
          </div>
          <div className="text-[#ff003c] font-[family-name:var(--font-orbitron)] text-xl font-bold w-16 text-right mr-4">{Math.ceil((hp / maxHp) * 100)}%</div>
        </div>
      </div>

      {/* Bottom Right: Ammo */}
      <div className="absolute bottom-10 right-10 z-20 flex flex-col items-end bg-black/50 backdrop-blur-md border border-[#00f0ff]/30 p-6 shadow-[0_0_20px_rgba(0,240,255,0.15)]" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px)' }}>
        <div className="text-[#00f0ff]/70 text-sm tracking-[0.3em] uppercase mb-2">Ammunition</div>
        <div className="flex items-end gap-3 mb-1">
          {isReloading && <span className="text-lg text-[#ff003c] animate-pulse tracking-widest font-bold mb-1">RELOADING //</span>}
          <div className="text-[#00f0ff] text-2xl font-bold tracking-widest font-[family-name:var(--font-orbitron)]">
            {inventory[currentWeaponIndex]?.name.toUpperCase()}
          </div>
        </div>
        <div className="flex items-baseline gap-2 font-[family-name:var(--font-orbitron)]">
          <span className="text-6xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] leading-none">{inventory[currentWeaponIndex]?.magazineSize === Infinity ? '∞' : (loadedAmmo[inventory[currentWeaponIndex]?.id] || 0)}</span>
          <span className="text-3xl text-white/30">/</span>
          <span className="text-3xl text-[#00f0ff]/60 leading-none">{inventory[currentWeaponIndex]?.magazineSize === Infinity ? '∞' : (ammo[inventory[currentWeaponIndex]?.id] || 0)}</span>
        </div>
      </div>

      {/* Futuristic Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="relative w-12 h-12 opacity-80" style={{ transform: 'translate(calc(-50% + 2px), calc(-50% - 2px))' }}>
          {/* Inner dots */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#00f0ff] rounded-full shadow-[0_0_5px_#00f0ff]"></div>
          
          {/* Outer angled brackets */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-[1.5px] border-l-[1.5px] border-[#00f0ff]/70"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-[1.5px] border-r-[1.5px] border-[#00f0ff]/70"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[1.5px] border-l-[1.5px] border-[#00f0ff]/70"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[1.5px] border-r-[1.5px] border-[#00f0ff]/70"></div>
          
          {/* Dash lines */}
          <div className="absolute top-1/2 -left-4 w-3 h-[1.5px] bg-[#00f0ff]/50 -translate-y-1/2"></div>
          <div className="absolute top-1/2 -right-4 w-3 h-[1.5px] bg-[#00f0ff]/50 -translate-y-1/2"></div>
          <div className="absolute -top-4 left-1/2 w-[1.5px] h-3 bg-[#00f0ff]/50 -translate-x-1/2"></div>
          <div className="absolute -bottom-4 left-1/2 w-[1.5px] h-3 bg-[#00f0ff]/50 -translate-x-1/2"></div>
        </div>
      </div>
    </div>
  );
}

