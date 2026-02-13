/**
 * Sound Manager for ISOLA: REBORN
 * Handles all game audio including:
 * - Villager action sounds (gathering, chopping, mining, etc.)
 * - Ambient sounds based on zoom level
 * - Spatial audio (sounds from direction of action)
 * - Volume control based on camera zoom
 * - Building construction sounds
 */

import { PLANET_VIEW_THRESHOLD, ZOOM_STRATEGIC, ZOOM_MEDIUM, ZOOM_DETAILED } from './camera';

// Sound types
export type SoundCategory = 'action' | 'ambient' | 'ui' | 'building' | 'event';
export type AmbientLayer = 'space' | 'wind' | 'nature' | 'village';

export interface SoundInstance {
  id: string;
  source: AudioBufferSourceNode | OscillatorNode;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  category: SoundCategory;
  isLooping: boolean;
  startTime: number;
}

export interface SpatialSoundOptions {
  worldX: number;
  worldY: number;
  cameraX: number;
  cameraY: number;
  volume?: number;
  loop?: boolean;
  duration?: number;
}

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<SoundCategory, GainNode> = new Map();
  private activeSounds: Map<string, SoundInstance> = new Map();
  private ambientLayers: Map<AmbientLayer, SoundInstance | null> = new Map();
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  
  private masterVolume = 0.5;
  private currentZoom = 1;
  private isMuted = false;
  private isInitialized = false;

  // Sound definitions using synthesized audio
  private soundDefinitions = {
    // Villager actions
    chop: { frequency: 200, duration: 0.1, type: 'square' as OscillatorType },
    mine: { frequency: 150, duration: 0.08, type: 'sawtooth' as OscillatorType },
    harvest: { frequency: 400, duration: 0.15, type: 'sine' as OscillatorType },
    footstep: { frequency: 80, duration: 0.05, type: 'triangle' as OscillatorType },
    eat: { frequency: 300, duration: 0.1, type: 'sine' as OscillatorType },
    
    // Events
    death: { frequency: 100, duration: 0.5, type: 'sine' as OscillatorType, decay: true },
    immigration: { frequency: 500, duration: 0.3, type: 'sine' as OscillatorType, ascending: true },
    birth: { frequency: 600, duration: 0.4, type: 'sine' as OscillatorType, ascending: true },
    
    // Building
    hammer: { frequency: 180, duration: 0.08, type: 'square' as OscillatorType },
    saw: { frequency: 250, duration: 0.2, type: 'sawtooth' as OscillatorType },
    buildComplete: { frequency: 800, duration: 0.5, type: 'sine' as OscillatorType, ascending: true },
    
    // Combat
    swordClash: { frequency: 300, duration: 0.1, type: 'sawtooth' as OscillatorType },
    
    // UI
    click: { frequency: 400, duration: 0.05, type: 'sine' as OscillatorType },
    success: { frequency: 600, duration: 0.2, type: 'sine' as OscillatorType, ascending: true },
    error: { frequency: 200, duration: 0.2, type: 'square' as OscillatorType },
  };

  constructor() {
    // Initialize ambient layers map
    this.ambientLayers.set('space', null);
    this.ambientLayers.set('wind', null);
    this.ambientLayers.set('nature', null);
    this.ambientLayers.set('village', null);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create master gain
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioContext.destination);

      // Create category gains
      const categories: SoundCategory[] = ['action', 'ambient', 'ui', 'building', 'event'];
      categories.forEach(category => {
        const gain = this.audioContext!.createGain();
        gain.gain.value = 1;
        gain.connect(this.masterGain!);
        this.categoryGains.set(category, gain);
      });

      this.isInitialized = true;
      console.log('Sound Manager initialized');
    } catch (error) {
      console.error('Failed to initialize Sound Manager:', error);
    }
  }

  private ensureContext(): boolean {
    if (!this.audioContext || !this.isInitialized) {
      return false;
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    return true;
  }

  // Play a synthesized sound
  playSound(
    soundName: keyof typeof this.soundDefinitions,
    category: SoundCategory = 'action',
    options: Partial<SpatialSoundOptions> = {}
  ): string | null {
    if (!this.ensureContext() || this.isMuted) return null;

    const def = this.soundDefinitions[soundName];
    if (!def) return null;

    const id = `${soundName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();
      const panNode = this.audioContext!.createStereoPanner();

      oscillator.type = def.type;
      oscillator.frequency.value = def.frequency;

      // Apply effects
      if ((def as any).ascending) {
        oscillator.frequency.setValueAtTime(def.frequency * 0.5, this.audioContext!.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          def.frequency * 1.5,
          this.audioContext!.currentTime + def.duration
        );
      }

      // Calculate spatial audio
      const volume = this.calculateVolume(options);
      const pan = this.calculatePan(options);
      
      gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext!.currentTime);
      
      if ((def as any).decay) {
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + def.duration);
      } else {
        gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext!.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, this.audioContext!.currentTime + def.duration);
      }

      panNode.pan.value = pan;

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(this.categoryGains.get(category)!);

      oscillator.start();
      oscillator.stop(this.audioContext!.currentTime + def.duration);

      const instance: SoundInstance = {
        id,
        source: oscillator,
        gainNode,
        panNode,
        category,
        isLooping: false,
        startTime: this.audioContext!.currentTime,
      };

      this.activeSounds.set(id, instance);

      oscillator.onended = () => {
        this.activeSounds.delete(id);
      };

      return id;
    } catch (error) {
      console.error('Error playing sound:', error);
      return null;
    }
  }

  // Play spatial sound at world position
  playSpatialSound(
    soundName: keyof typeof this.soundDefinitions,
    worldX: number,
    worldY: number,
    cameraX: number,
    cameraY: number,
    category: SoundCategory = 'action'
  ): string | null {
    return this.playSound(soundName, category, {
      worldX,
      worldY,
      cameraX,
      cameraY,
    });
  }

  // Ambient sound layers based on zoom level
  updateAmbientSounds(zoom: number): void {
    if (!this.ensureContext() || this.isMuted) return;

    this.currentZoom = zoom;

    // Calculate volumes for each layer based on zoom
    const spaceVolume = zoom < PLANET_VIEW_THRESHOLD ? 0.4 : 
                        zoom < ZOOM_STRATEGIC ? 0.2 * (1 - (zoom - PLANET_VIEW_THRESHOLD) / (ZOOM_STRATEGIC - PLANET_VIEW_THRESHOLD)) : 0;
    
    const windVolume = zoom >= PLANET_VIEW_THRESHOLD && zoom < ZOOM_MEDIUM ? 
                       0.3 * Math.min(1, (zoom - PLANET_VIEW_THRESHOLD) / (ZOOM_MEDIUM - PLANET_VIEW_THRESHOLD)) : 
                       zoom >= ZOOM_MEDIUM ? 0.15 : 0;
    
    const natureVolume = zoom >= ZOOM_STRATEGIC && zoom < ZOOM_DETAILED ?
                         0.35 * ((zoom - ZOOM_STRATEGIC) / (ZOOM_DETAILED - ZOOM_STRATEGIC)) :
                         zoom >= ZOOM_DETAILED ? 0.35 : 0;
    
    const villageVolume = zoom >= ZOOM_MEDIUM ? 
                          0.25 * Math.min(1, (zoom - ZOOM_MEDIUM) / (ZOOM_DETAILED - ZOOM_MEDIUM)) : 0;

    // Update or create ambient layers
    this.updateAmbientLayer('space', spaceVolume, this.createSpaceAmbient.bind(this));
    this.updateAmbientLayer('wind', windVolume, this.createWindAmbient.bind(this));
    this.updateAmbientLayer('nature', natureVolume, this.createNatureAmbient.bind(this));
    this.updateAmbientLayer('village', villageVolume, this.createVillageAmbient.bind(this));
  }

  private updateAmbientLayer(
    layer: AmbientLayer,
    targetVolume: number,
    createFn: () => SoundInstance | null
  ): void {
    const existing = this.ambientLayers.get(layer);

    if (targetVolume > 0.01) {
      if (!existing) {
        const newInstance = createFn();
        if (newInstance) {
          this.ambientLayers.set(layer, newInstance);
          // Fade in
          newInstance.gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime);
          newInstance.gainNode.gain.linearRampToValueAtTime(targetVolume * 0.15, this.audioContext!.currentTime + 1);
        }
      } else {
        // Smooth volume transition
        existing.gainNode.gain.linearRampToValueAtTime(targetVolume * 0.15, this.audioContext!.currentTime + 0.5);
      }
    } else if (existing) {
      // Fade out and stop
      existing.gainNode.gain.linearRampToValueAtTime(0, this.audioContext!.currentTime + 1);
      setTimeout(() => {
        try {
          existing.source.stop();
        } catch (e) {}
        this.ambientLayers.set(layer, null);
      }, 1100);
    }
  }

  private createSpaceAmbient(): SoundInstance | null {
    if (!this.audioContext) return null;

    // Create ethereal space ambience using filtered noise
    const bufferSize = this.audioContext.sampleRate * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    const gainNode = this.audioContext.createGain();
    const panNode = this.audioContext.createStereoPanner();

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.categoryGains.get('ambient')!);

    source.start();

    return {
      id: 'ambient_space',
      source,
      gainNode,
      panNode,
      category: 'ambient',
      isLooping: true,
      startTime: this.audioContext.currentTime,
    };
  }

  private createWindAmbient(): SoundInstance | null {
    if (!this.audioContext) return null;

    const bufferSize = this.audioContext.sampleRate * 3;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Create wind-like noise with varying amplitude
    for (let i = 0; i < bufferSize; i++) {
      const windMod = Math.sin(i / (this.audioContext.sampleRate * 0.5)) * 0.5 + 0.5;
      data[i] = (Math.random() * 2 - 1) * 0.15 * windMod;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;

    const gainNode = this.audioContext.createGain();
    const panNode = this.audioContext.createStereoPanner();

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.categoryGains.get('ambient')!);

    source.start();

    return {
      id: 'ambient_wind',
      source,
      gainNode,
      panNode,
      category: 'ambient',
      isLooping: true,
      startTime: this.audioContext.currentTime,
    };
  }

  private createNatureAmbient(): SoundInstance | null {
    if (!this.audioContext) return null;

    // Create nature sounds with occasional bird-like chirps
    const bufferSize = this.audioContext.sampleRate * 4;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // Base rustling
      let sample = (Math.random() * 2 - 1) * 0.05;
      
      // Add occasional chirps
      const chirpChance = Math.random();
      if (chirpChance > 0.9999) {
        const chirpFreq = 800 + Math.random() * 400;
        const chirpDuration = 0.02 * this.audioContext.sampleRate;
        for (let j = 0; j < chirpDuration && i + j < bufferSize; j++) {
          const env = Math.sin((j / chirpDuration) * Math.PI);
          data[i + j] = Math.sin((j / this.audioContext.sampleRate) * chirpFreq * Math.PI * 2) * env * 0.2;
        }
        i += chirpDuration;
      }
      
      if (i < bufferSize) data[i] = sample;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 500;

    const gainNode = this.audioContext.createGain();
    const panNode = this.audioContext.createStereoPanner();

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.categoryGains.get('ambient')!);

    source.start();

    return {
      id: 'ambient_nature',
      source,
      gainNode,
      panNode,
      category: 'ambient',
      isLooping: true,
      startTime: this.audioContext.currentTime,
    };
  }

  private createVillageAmbient(): SoundInstance | null {
    if (!this.audioContext) return null;

    // Create village sounds with occasional human activity
    const bufferSize = this.audioContext.sampleRate * 5;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // Low murmur
      let sample = (Math.random() * 2 - 1) * 0.03;
      
      // Occasional distant sounds
      const soundChance = Math.random();
      if (soundChance > 0.99995) {
        // Random distant sound (footstep, clink, etc.)
        const duration = 0.05 * this.audioContext.sampleRate;
        const freq = 100 + Math.random() * 200;
        for (let j = 0; j < duration && i + j < bufferSize; j++) {
          const env = Math.exp(-j / (duration * 0.3));
          data[i + j] = Math.sin((j / this.audioContext.sampleRate) * freq * Math.PI * 2) * env * 0.1;
        }
        i += duration;
      }
      
      if (i < bufferSize) data[i] = sample;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = this.audioContext.createGain();
    const panNode = this.audioContext.createStereoPanner();

    source.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.categoryGains.get('ambient')!);

    source.start();

    return {
      id: 'ambient_village',
      source,
      gainNode,
      panNode,
      category: 'ambient',
      isLooping: true,
      startTime: this.audioContext.currentTime,
    };
  }

  private calculateVolume(options: Partial<SpatialSoundOptions>): number {
    let volume = options.volume ?? 1;
    
    // Reduce volume when zoomed out
    if (this.currentZoom < ZOOM_DETAILED) {
      volume *= Math.max(0.2, this.currentZoom / ZOOM_DETAILED);
    }

    // Distance-based attenuation if position provided
    if (options.worldX !== undefined && options.cameraX !== undefined) {
      const dx = options.worldX - options.cameraX;
      const dy = (options.worldY ?? 0) - (options.cameraY ?? 0);
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 800 / this.currentZoom;
      volume *= Math.max(0, 1 - distance / maxDistance);
    }

    return Math.max(0, Math.min(1, volume));
  }

  private calculatePan(options: Partial<SpatialSoundOptions>): number {
    if (options.worldX === undefined || options.cameraX === undefined) return 0;

    const dx = options.worldX - options.cameraX;
    const maxPanDistance = 400 / this.currentZoom;
    return Math.max(-1, Math.min(1, dx / maxPanDistance));
  }

  // Play building construction sounds
  playBuildingSound(type: 'start' | 'progress' | 'complete', worldX: number, worldY: number, cameraX: number, cameraY: number): void {
    if (type === 'start' || type === 'progress') {
      // Random construction sound
      const sounds: (keyof typeof this.soundDefinitions)[] = ['hammer', 'saw', 'chop'];
      const sound = sounds[Math.floor(Math.random() * sounds.length)];
      this.playSpatialSound(sound, worldX, worldY, cameraX, cameraY, 'building');
    } else if (type === 'complete') {
      this.playSpatialSound('buildComplete', worldX, worldY, cameraX, cameraY, 'building');
    }
  }

  // Play villager action sounds
  playActionSound(
    action: string,
    worldX: number,
    worldY: number,
    cameraX: number,
    cameraY: number
  ): void {
    // Only play sounds when zoomed in enough
    if (this.currentZoom < ZOOM_STRATEGIC) return;

    const actionSoundMap: Record<string, keyof typeof this.soundDefinitions> = {
      gathering: 'chop',
      farming: 'harvest',
      building: 'hammer',
      mining: 'mine',
      eating: 'eat',
    };

    const sound = actionSoundMap[action];
    if (sound) {
      // Throttle sounds - don't play too frequently
      const soundKey = `${action}_${Math.floor(worldX / 50)}_${Math.floor(worldY / 50)}`;
      if (!this.activeSounds.has(soundKey)) {
        this.playSpatialSound(sound, worldX, worldY, cameraX, cameraY, 'action');
      }
    }
  }

  // Event sounds
  playEventSound(eventType: 'death' | 'immigration' | 'birth' | 'disaster' | 'blessing'): void {
    const eventSoundMap: Record<string, keyof typeof this.soundDefinitions> = {
      death: 'death',
      immigration: 'immigration',
      birth: 'birth',
      disaster: 'error',
      blessing: 'success',
    };

    const sound = eventSoundMap[eventType];
    if (sound) {
      this.playSound(sound, 'event', { volume: 0.8 });
    }
  }

  // Volume controls
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(
        this.masterVolume,
        this.audioContext!.currentTime + 0.1
      );
    }
  }

  setCategoryVolume(category: SoundCategory, volume: number): void {
    const gain = this.categoryGains.get(category);
    if (gain) {
      gain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1, volume)),
        this.audioContext!.currentTime + 0.1
      );
    }
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.audioContext!.currentTime + 0.1
      );
    }
    return this.isMuted;
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  // Cleanup
  stopAllSounds(): void {
    this.activeSounds.forEach(sound => {
      try {
        sound.source.stop();
      } catch (e) {}
    });
    this.activeSounds.clear();

    this.ambientLayers.forEach((sound, key) => {
      if (sound) {
        try {
          sound.source.stop();
        } catch (e) {}
        this.ambientLayers.set(key, null);
      }
    });
  }

  dispose(): void {
    this.stopAllSounds();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
let soundManagerInstance: SoundManager | null = null;

export function getSoundManager(): SoundManager {
  if (!soundManagerInstance) {
    soundManagerInstance = new SoundManager();
  }
  return soundManagerInstance;
}

export function initializeSoundManager(): Promise<void> {
  return getSoundManager().initialize();
}
