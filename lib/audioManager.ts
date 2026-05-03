'use client';

class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  private musicTracks = [
    '/Music2.mp3',
    '/Music4.mp3',
    '/Music3.mp3',
    '/Music1.mp3'
  ];
  private currentTrackIndex = 0;
  private musicElement: HTMLAudioElement | null = null;
  private isMusicPlaying = false;
  private musicSource: MediaElementAudioSourceNode | null = null;

  constructor() {
    // We'll initialize on the first user interaction
  }

  private init() {
    if (this.initialized) return;
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.masterGain.gain.value = 0.3; // Global volume
      
      // Initialize music element
      this.musicElement = new Audio();
      this.musicElement.volume = 0.8; // Music volume
      this.musicElement.addEventListener('ended', () => this.playNextTrack());
      this.musicElement.addEventListener('error', (e) => console.error('Music element error:', e));
      
      // Connect to graph
      this.musicSource = this.context.createMediaElementSource(this.musicElement);
      this.musicSource.connect(this.masterGain);
      
      this.initialized = true;
      console.log('AudioManager initialized with music support');
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  private playNextTrack() {
    if (!this.musicElement) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
    console.log('Playing next track:', this.musicTracks[this.currentTrackIndex]);
    
    // Change src and immediately play
    this.musicElement.src = this.musicTracks[this.currentTrackIndex];
    this.musicElement.load();
    this.musicElement.play().catch(e => console.warn('Music play failed:', e));
  }

  public startMusic() {
    this.init();
    this.resume();
    if (!this.musicElement || this.isMusicPlaying) return;
    
    console.log('Starting music playlist...');
    this.isMusicPlaying = true;
    this.musicElement.src = this.musicTracks[this.currentTrackIndex];
    this.musicElement.play().then(() => {
        console.log('Music started successfully');
    }).catch(e => {
        console.warn('Music play failed (interaction required?):', e);
        this.isMusicPlaying = false;
    });
  }

  public stopMusic() {
    // Intentionally empty, keep music always playing
  }

  public stopAll() {
    // Only suspend non-music audio if needed, but doing nothing is safer to not kill music context
  }

  public pauseMusic() {
    // Intentionally empty, keep music always playing
  }

  public resumeMusic() {
    // Intentionally empty, handled by global startMusic
  }

  private resume() {
    if (this.context?.state === 'suspended') {
      this.context.resume();
    }
  }

  // --- Procedural Sounds ---

  public playShoot(weaponType: string) {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;

    switch (weaponType) {
      case 'basic-blaster':
        this.pew(time, 400, 100, 0.15, 'sawtooth', 0.8, -20);
        this.noise(time, 0.1, 0.01, 0.2, 2000, 500);
        break;
      case 'neon-rifle':
        this.pew(time, 800, 150, 0.05, 'sawtooth', 0.5, -50);
        this.pew(time + 0.01, 200, 100, 0.08, 'square', 0.6);
        this.noise(time, 0.1, 0.01, 0.2, 5000, 300);
        break;
      case 'plasma-shotgun':
        this.noise(time, 0.3, 0.02, 0.8, 4000, 100);
        for (let i = 0; i < 6; i++) {
          this.pew(time + i * 0.005, 150 + Math.random()*100, 50, 0.2, 'square', 0.5);
        }
        break;
      case 'pulse-smg':
        this.pew(time, 900, 200, 0.08, 'sawtooth', 0.5, 30);
        this.noise(time, 0.05, 0.01, 0.3, 3000, 1000);
        break;
      case 'laser-cannon':
        this.pew(time, 150, 40, 0.8, 'square', 1.0, 50);
        this.pew(time, 300, 80, 0.5, 'sawtooth', 0.8);
        this.noise(time, 0.6, 0.05, 1.0, 5000, 500);
        break;
      default:
        this.pew(time, 400, 100, 0.1, 'square');
    }
  }

  public playEnemyShoot(enemyType: string) {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;

    switch (enemyType) {
      case 'drone':
        this.pew(time, 1200, 800, 0.1, 'square', 0.3, 50);
        break;
      case 'spider':
        this.pew(time, 300, 100, 0.15, 'sawtooth', 0.4);
        break;
      case 'retro-bot':
        this.pew(time, 500, 300, 0.2, 'square', 0.3);
        this.noise(time, 0.1, 0.01, 0.1, 1000, 200);
        break;
      case 'boss':
        this.pew(time, 250, 80, 0.15, 'sawtooth', 0.5, 20);
        break;
      default:
        this.pew(time, 600, 200, 0.1, 'square', 0.2);
    }
  }

  public playPickup(type: string) {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;

    switch (type) {
      case 'health':
        this.pew(time, 600, 1200, 0.3, 'sine', 0.4);
        this.pew(time + 0.1, 800, 1600, 0.3, 'sine', 0.4);
        break;
      case 'ammo':
        this.pew(time, 800, 1200, 0.15, 'square', 0.3);
        this.pew(time + 0.1, 1000, 1400, 0.15, 'square', 0.3);
        break;
      case 'weapon':
        this.pew(time, 400, 800, 0.2, 'sawtooth', 0.4);
        this.pew(time + 0.1, 600, 1200, 0.2, 'sawtooth', 0.4);
        this.pew(time + 0.2, 800, 1600, 0.3, 'sawtooth', 0.5);
        break;
      default:
        this.pew(time, 500, 1000, 0.2, 'sine', 0.3);
    }
  }

  public playEnemyAmbient(enemyType: string) {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;

    switch (enemyType) {
      case 'spider':
        this.pew(time, 400, 200, 0.2, 'square', 0.1, 50);
        break;
      case 'swordsman':
        this.noise(time, 0.2, 0.1, 0.1, 800, 200);
        break;
      case 'drone':
        this.pew(time, 800, 820, 0.3, 'triangle', 0.05, 10);
        break;
      default:
        this.noise(time, 0.1, 0.05, 0.05, 600, 300);
    }
  }

  public playEnemyHit(enemyType: string) {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;

    switch (enemyType) {
      case 'spider':
        this.pew(time, 800, 300, 0.1, 'square', 0.4, 100);
        this.noise(time, 0.1, 0.01, 0.2, 2000, 500);
        break;
      case 'swordsman':
        this.pew(time, 400, 150, 0.15, 'sawtooth', 0.5);
        this.noise(time, 0.15, 0.02, 0.4, 3000, 800);
        break;
      case 'boss':
        this.pew(time, 200, 80, 0.2, 'sawtooth', 0.6, -20);
        this.noise(time, 0.2, 0.02, 0.5, 1500, 300);
        break;
      default:
        this.pew(time, 600, 200, 0.1, 'sawtooth', 0.3);
    }
  }

  public playEnemyDeath(enemyType: string) {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;

    this.playExplosion(enemyType === 'boss' ? 2.0 : 1.0);

    if (enemyType === 'boss') {
      this.pew(time, 150, 30, 2.0, 'square', 1.0, 50);
      this.noise(time, 1.5, 0.1, 1.0, 4000, 100);
    } else {
      this.pew(time, 300, 50, 0.5, 'square', 0.6, 20);
    }
  }

  public playPlayerHit() {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;
    
    this.pew(time, 200, 50, 0.4, 'square', 0.8, -50);
    this.noise(time, 0.3, 0.02, 0.8, 3000, 200);
  }

  public playExplosion(intensity = 1.0) {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;

    const ctx = this.context;
    const time = ctx.currentTime;

    this.noise(time, 0.6 * intensity, 0.05, 0.8 * intensity, 2500, 100);
    this.pew(time, 120, 30, 0.6 * intensity, 'sawtooth', 0.7 * intensity, -20);
    this.pew(time, 80, 20, 0.8 * intensity, 'square', 0.8 * intensity, 0);
  }

  public playWeaponSwitch() {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;
    const time = this.context.currentTime;
    this.pew(time, 1200, 1800, 0.08, 'square', 0.15, 30);
    this.pew(time + 0.02, 600, 200, 0.05, 'sawtooth', 0.1);
  }

  public playReload() {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;
    const time = this.context.currentTime;
    
    // Eject mag (mechanical clack)
    this.pew(time, 600, 200, 0.1, 'square', 0.4);
    this.noise(time, 0.1, 0.01, 0.2, 2000, 100);
    
    // Insert new mag (deeper clunk)
    this.pew(time + 0.3, 300, 150, 0.1, 'square', 0.5);
    this.noise(time + 0.3, 0.1, 0.01, 0.3, 1500, 80);

    // Chamber round (high pitched tech click)
    this.pew(time + 0.5, 1200, 1800, 0.1, 'sawtooth', 0.3);
    this.pew(time + 0.55, 1800, 2400, 0.1, 'sine', 0.3);
  }

  public playUIHover() {
    this.init();
    this.resume();
    this.startMusic();
    if (!this.context || !this.masterGain) return;
    this.pew(this.context.currentTime, 1200, 1250, 0.05, 'sine', 0.1);
  }

  public playUIClick() {
    this.init();
    this.resume();
    this.startMusic();
    if (!this.context || !this.masterGain) return;
    const time = this.context.currentTime;
    this.pew(time, 2000, 1000, 0.08, 'square', 0.15);
    this.pew(time, 800, 400, 0.1, 'sawtooth', 0.1);
  }

  public playUIError() {
    this.init();
    this.resume();
    if (!this.context || !this.masterGain) return;
    const time = this.context.currentTime;
    this.pew(time, 300, 150, 0.2, 'square', 0.3, 50);
    this.pew(time + 0.1, 300, 150, 0.2, 'square', 0.3, 50);
  }

  // --- Synthesizer Primitives ---

  private pew(startTime: number, startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.5, detuneAmt: number = 0) {
    if (!this.context || !this.masterGain) return;

    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq || 0.01, startTime + duration);
    if (detuneAmt) {
        osc.detune.setValueAtTime(0, startTime);
        osc.detune.linearRampToValueAtTime(detuneAmt, startTime + duration);
    }

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private noiseBuffer: AudioBuffer | null = null;
  private getNoiseBuffer(duration: number): AudioBuffer {
    if (!this.context) throw new Error('No context');
    
    const bufferSize = this.context.sampleRate * 2.0; 
    
    if (!this.noiseBuffer) {
        this.noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
    }
    return this.noiseBuffer;
  }

  private noise(startTime: number, duration: number, attack: number, volume: number, startFreq: number = 1000, endFreq: number = 100) {
    if (!this.context || !this.masterGain) return;

    const noise = this.context.createBufferSource();
    noise.buffer = this.getNoiseBuffer(duration);
    noise.loop = true;

    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(endFreq || 10, startTime + duration);
    // Add resonance for sci-fi metallic sound
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }
}

export const audioManager = new AudioManager();
