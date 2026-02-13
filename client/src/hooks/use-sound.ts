/**
 * Sound Hook for ISOLA: REBORN
 * React hook for integrating sound manager with game components
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SoundManager, getSoundManager, initializeSoundManager, SoundCategory } from '@/lib/sound-manager';
import { CameraState } from '@/lib/camera';
import { Villager, GameEvent } from '@shared/schema';

export interface UseSoundOptions {
  enabled?: boolean;
  masterVolume?: number;
}

export function useSound(options: UseSoundOptions = {}) {
  const { enabled = true, masterVolume = 0.5 } = options;
  
  const soundManagerRef = useRef<SoundManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const lastAmbientUpdateRef = useRef(0);
  const actionSoundCooldowns = useRef<Map<string, number>>(new Map());

  // Initialize sound manager
  useEffect(() => {
    if (!enabled) return;

    const init = async () => {
      await initializeSoundManager();
      soundManagerRef.current = getSoundManager();
      soundManagerRef.current.setMasterVolume(masterVolume);
      setIsInitialized(true);
    };

    init();

    return () => {
      if (soundManagerRef.current) {
        soundManagerRef.current.stopAllSounds();
      }
    };
  }, [enabled]);

  // Update master volume
  useEffect(() => {
    if (soundManagerRef.current && isInitialized) {
      soundManagerRef.current.setMasterVolume(masterVolume);
    }
  }, [masterVolume, isInitialized]);

  // Update ambient sounds based on camera zoom
  const updateAmbientSounds = useCallback((camera: CameraState) => {
    if (!soundManagerRef.current || !isInitialized) return;

    const now = Date.now();
    // Throttle ambient updates to every 100ms
    if (now - lastAmbientUpdateRef.current < 100) return;
    lastAmbientUpdateRef.current = now;

    soundManagerRef.current.updateAmbientSounds(camera.zoom);
  }, [isInitialized]);

  // Play villager action sounds
  const playActionSound = useCallback((
    villager: Villager,
    camera: CameraState
  ) => {
    if (!soundManagerRef.current || !isInitialized) return;

    const action = villager.action;
    if (!action || action === 'idle' || action === 'sleeping') return;

    // Cooldown to prevent sound spam
    const cooldownKey = `${villager.id}_${action}`;
    const now = Date.now();
    const lastPlayed = actionSoundCooldowns.current.get(cooldownKey) || 0;
    
    // Different cooldowns for different actions
    const cooldowns: Record<string, number> = {
      gathering: 800,
      farming: 1000,
      building: 600,
      eating: 1200,
      fleeing: 500,
      research: 2000,
    };
    
    const cooldown = cooldowns[action] || 1000;
    if (now - lastPlayed < cooldown) return;

    actionSoundCooldowns.current.set(cooldownKey, now);
    soundManagerRef.current.playActionSound(
      action,
      villager.posX,
      villager.posY,
      camera.x,
      camera.y
    );
  }, [isInitialized]);

  // Play event sounds
  const playEventSound = useCallback((event: GameEvent) => {
    if (!soundManagerRef.current || !isInitialized) return;

    const eventType = event.type as 'death' | 'immigration' | 'birth' | 'disaster' | 'blessing';
    soundManagerRef.current.playEventSound(eventType);
  }, [isInitialized]);

  // Play building sounds
  const playBuildingSound = useCallback((
    type: 'start' | 'progress' | 'complete',
    worldX: number,
    worldY: number,
    camera: CameraState
  ) => {
    if (!soundManagerRef.current || !isInitialized) return;

    soundManagerRef.current.playBuildingSound(type, worldX, worldY, camera.x, camera.y);
  }, [isInitialized]);

  // Play UI sounds
  const playUISound = useCallback((soundName: 'click' | 'success' | 'error') => {
    if (!soundManagerRef.current || !isInitialized) return;

    soundManagerRef.current.playSound(soundName, 'ui', { volume: 0.5 });
  }, [isInitialized]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!soundManagerRef.current) return;

    const newMuted = soundManagerRef.current.toggleMute();
    setIsMuted(newMuted);
    return newMuted;
  }, []);

  // Set category volume
  const setCategoryVolume = useCallback((category: SoundCategory, volume: number) => {
    if (!soundManagerRef.current) return;
    soundManagerRef.current.setCategoryVolume(category, volume);
  }, []);

  // Get sound manager for direct access if needed
  const getSoundManagerInstance = useCallback(() => soundManagerRef.current, []);

  return {
    isInitialized,
    isMuted,
    updateAmbientSounds,
    playActionSound,
    playEventSound,
    playBuildingSound,
    playUISound,
    toggleMute,
    setCategoryVolume,
    getSoundManagerInstance,
  };
}

// Sound settings panel component data
export interface SoundSettings {
  masterVolume: number;
  ambientVolume: number;
  actionVolume: number;
  uiVolume: number;
  buildingVolume: number;
  eventVolume: number;
  isMuted: boolean;
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  masterVolume: 0.5,
  ambientVolume: 0.7,
  actionVolume: 0.6,
  uiVolume: 0.5,
  buildingVolume: 0.6,
  eventVolume: 0.8,
  isMuted: false,
};
