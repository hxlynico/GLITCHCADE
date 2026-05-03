// Game state management
import { create } from 'zustand';

export type Weapon = {
  id: string;
  name: string;
  color: string;
  damage: number;
  fireRate: number; // ms between shots
  type: 'pistol' | 'rifle' | 'shotgun' | 'sniper' | 'smg' | 'heavy' | 'melee';
  magazineSize: number;
  reloadTime: number; // ms
};

export const WEAPON_TYPES: Record<string, Weapon> = {
  'laser-sword': { id: 'laser-sword', name: 'Laser Sword', color: '#00ccff', damage: 250, fireRate: 400, type: 'melee', magazineSize: Infinity, reloadTime: 0 },
  'basic-blaster': { id: 'basic-blaster', name: 'Blaster', color: '#00ffff', damage: 65, fireRate: 400, type: 'pistol', magazineSize: 12, reloadTime: 1000 },
  'neon-rifle': { id: 'neon-rifle', name: 'Rifle', color: '#ff00ff', damage: 110, fireRate: 150, type: 'rifle', magazineSize: 30, reloadTime: 1500 },
  'plasma-shotgun': { id: 'plasma-shotgun', name: 'Shotgun', color: '#00ff00', damage: 320, fireRate: 800, type: 'shotgun', magazineSize: 8, reloadTime: 2000 },
  'pulse-smg': { id: 'pulse-smg', name: 'SMG', color: '#ffaa00', damage: 45, fireRate: 80, type: 'smg', magazineSize: 40, reloadTime: 1200 },
  'laser-cannon': { id: 'laser-cannon', name: 'Cannon', color: '#ff0055', damage: 850, fireRate: 1500, type: 'heavy', magazineSize: 5, reloadTime: 3000 },
};

export interface ProjectileData {
  id: string;
  position: [number, number, number];
  direction: [number, number, number];
  damage: number;
  color: string;
  isEnemy: boolean;
  speed: number;
  createdAt: number;
  gravity?: boolean;
  size?: number;
  projType?: 'normal' | 'bomb' | 'melee';
}

export interface ExplosionData {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
}

interface GameState {
  hp: number;
  maxHp: number;
  inventory: Weapon[];
  currentWeaponIndex: number;
  ammo: Record<string, number>;
  loadedAmmo: Record<string, number>;
  isReloading: boolean;
  isDead: boolean;
  paused: boolean;
  score: number;
  resetCounter: number;
  started: boolean;
  projectiles: ProjectileData[];
  explosions: ExplosionData[];
  
  // Actions
  setStarted: (started: boolean) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  addWeapon: (weaponId: string) => void;
  equipWeapon: (index: number) => void;
  addAmmo: (weaponId: string, amount: number) => void;
  consumeAmmo: (weaponId: string) => boolean;
  reloadWeapon: (weaponId: string) => void;
  setReloading: (isReloading: boolean) => void;
  setPaused: (paused: boolean) => void;
  addScore: (points: number) => void;
  resetGame: () => void;
  addProjectile: (proj: ProjectileData) => void;
  removeProjectile: (id: string) => void;
  addExplosion: (exp: ExplosionData) => void;
  removeExplosion: (id: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  hp: 100,
  maxHp: 100,
  inventory: [
    WEAPON_TYPES['basic-blaster']
  ],
  currentWeaponIndex: 0,
  ammo: {
    'basic-blaster': 48,
    'neon-rifle': 0,
    'plasma-shotgun': 0,
    'pulse-smg': 0,
    'laser-cannon': 0,
  },
  loadedAmmo: {
    'basic-blaster': 12,
    'pulse-smg': 0,
    'neon-rifle': 0,
    'plasma-shotgun': 0,
    'laser-cannon': 0,
  },
  isReloading: false,
  isDead: false,
  paused: true,
  score: 0,
  resetCounter: 0,
  started: false,
  projectiles: [],
  explosions: [],

  setStarted: (started) => set({ started }),
  takeDamage: (amount) => set((state) => {
    // Player takes 90% of original damage (increased difficulty)
    const balancedAmount = amount * 0.9;
    const newHp = Math.max(0, state.hp - balancedAmount);
    const isDead = newHp === 0;
    return { hp: newHp, isDead, paused: isDead ? true : state.paused };
  }),
  
  heal: (amount) => set((state) => ({
    hp: Math.min(state.maxHp, state.hp + amount)
  })),

  addWeapon: (weaponId) => set((state) => {
    const weapon = WEAPON_TYPES[weaponId];
    if (!weapon || state.inventory.find(w => w.id === weaponId)) {
        // If already have it, maybe add ammo instead
        const currentAmmo = state.ammo[weaponId] || 0;
        return { ammo: { ...state.ammo, [weaponId]: currentAmmo + (weapon?.magazineSize || 30) } };
    }
    
    // Add new weapon and initialize ammo
    return { 
      inventory: [...state.inventory, weapon],
      loadedAmmo: { ...state.loadedAmmo, [weaponId]: weapon.magazineSize === Infinity ? Infinity : weapon.magazineSize },
      ammo: { ...state.ammo, [weaponId]: weapon.magazineSize === Infinity ? Infinity : weapon.magazineSize * 2 }
    };
  }),

  equipWeapon: (index) => set((state) => {
    if (index >= 0 && index < state.inventory.length) {
      return { currentWeaponIndex: index };
    }
    return state;
  }),

  addAmmo: (weaponId, amount) => set((state) => {
    const current = state.ammo[weaponId] || 0;
    return { ammo: { ...state.ammo, [weaponId]: current + amount } };
  }),

  consumeAmmo: (weaponId) => {
    const weapon = WEAPON_TYPES[weaponId];
    if (weapon?.magazineSize === Infinity) return true; // infinite
    const { loadedAmmo } = get();
    const current = loadedAmmo[weaponId] || 0;
    if (current > 0) {
      set({ loadedAmmo: { ...loadedAmmo, [weaponId]: current - 1 } });
      return true;
    }
    return false;
  },

  reloadWeapon: (weaponId) => {
    const state = get();
    const weapon = WEAPON_TYPES[weaponId];
    if (!weapon || weapon.magazineSize === Infinity) return;

    const currentLoaded = state.loadedAmmo[weaponId] || 0;
    const currentReserve = state.ammo[weaponId] || 0;
    const amountNeeded = weapon.magazineSize - currentLoaded;

    if (amountNeeded <= 0 || currentReserve <= 0) return;

    const amountToReload = Math.min(amountNeeded, currentReserve);

    set({
      loadedAmmo: { ...state.loadedAmmo, [weaponId]: currentLoaded + amountToReload },
      ammo: { ...state.ammo, [weaponId]: currentReserve - amountToReload }
    });
  },

  setReloading: (isReloading) => set({ isReloading }),
  
  setPaused: (paused) => set({ paused }),

  addScore: (points) => set((state) => ({ score: state.score + points })),

  resetGame: () => set((state) => ({
    hp: 100,
    inventory: [
      WEAPON_TYPES['basic-blaster']
    ],
    currentWeaponIndex: 0,
    ammo: {
      'basic-blaster': 48,
      'neon-rifle': 0,
      'plasma-shotgun': 0,
      'pulse-smg': 0,
      'laser-cannon': 0,
    },
    loadedAmmo: {
      'basic-blaster': 12,
      'pulse-smg': 0,
      'neon-rifle': 0,
      'plasma-shotgun': 0,
      'laser-cannon': 0,
    },
    isReloading: false,
    isDead: false,
    paused: true,
    score: 0,
    started: false,
    resetCounter: state.resetCounter + 1,
    projectiles: [],
    explosions: []
  })),

  addProjectile: (proj) => set((state) => ({ projectiles: [...state.projectiles, proj] })),
  removeProjectile: (id) => set((state) => ({ projectiles: state.projectiles.filter(p => p.id !== id) })),
  addExplosion: (exp) => set((state) => ({ explosions: [...state.explosions, exp] })),
  removeExplosion: (id) => set((state) => ({ explosions: state.explosions.filter(e => e.id !== id) })),
}));
