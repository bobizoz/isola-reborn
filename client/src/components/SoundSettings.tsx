/**
 * Sound Settings Component
 * UI for controlling game audio settings
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Music, Hammer, Zap, Bell, Footprints } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SoundSettings, DEFAULT_SOUND_SETTINGS } from '@/hooks/use-sound';
import { SoundCategory } from '@/lib/sound-manager';

interface SoundSettingsPanelProps {
  settings: SoundSettings;
  onSettingsChange: (settings: SoundSettings) => void;
  onCategoryVolumeChange: (category: SoundCategory, volume: number) => void;
  onToggleMute: () => void;
}

export function SoundSettingsPanel({
  settings,
  onSettingsChange,
  onCategoryVolumeChange,
  onToggleMute,
}: SoundSettingsPanelProps) {
  const handleSliderChange = (key: keyof SoundSettings, value: number) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);

    // Map setting key to sound category
    const categoryMap: Record<string, SoundCategory> = {
      ambientVolume: 'ambient',
      actionVolume: 'action',
      uiVolume: 'ui',
      buildingVolume: 'building',
      eventVolume: 'event',
    };

    const category = categoryMap[key];
    if (category) {
      onCategoryVolumeChange(category, value);
    }
  };

  const sliderConfigs = [
    { 
      key: 'masterVolume' as const, 
      label: 'Master Volume', 
      icon: settings.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />,
      color: 'bg-primary'
    },
    { 
      key: 'ambientVolume' as const, 
      label: 'Ambient', 
      icon: <Music className="w-4 h-4" />,
      color: 'bg-blue-500'
    },
    { 
      key: 'actionVolume' as const, 
      label: 'Actions', 
      icon: <Footprints className="w-4 h-4" />,
      color: 'bg-green-500'
    },
    { 
      key: 'buildingVolume' as const, 
      label: 'Building', 
      icon: <Hammer className="w-4 h-4" />,
      color: 'bg-amber-500'
    },
    { 
      key: 'eventVolume' as const, 
      label: 'Events', 
      icon: <Zap className="w-4 h-4" />,
      color: 'bg-purple-500'
    },
    { 
      key: 'uiVolume' as const, 
      label: 'UI', 
      icon: <Bell className="w-4 h-4" />,
      color: 'bg-gray-500'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Mute toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {settings.isMuted ? (
            <VolumeX className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">Sound</span>
        </div>
        <Switch
          checked={!settings.isMuted}
          onCheckedChange={onToggleMute}
        />
      </div>

      {/* Volume sliders */}
      <div className={`space-y-3 ${settings.isMuted ? 'opacity-50 pointer-events-none' : ''}`}>
        {sliderConfigs.map(({ key, label, icon, color }) => (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                {icon}
                <span>{label}</span>
              </div>
              <span className="text-muted-foreground w-8 text-right">
                {Math.round((settings[key] as number) * 100)}%
              </span>
            </div>
            <Slider
              value={[settings[key] as number]}
              max={1}
              step={0.05}
              onValueChange={([value]) => handleSliderChange(key, value)}
              className="cursor-pointer"
            />
          </div>
        ))}
      </div>

      {/* Reset button */}
      <button
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => onSettingsChange(DEFAULT_SOUND_SETTINGS)}
      >
        Reset to defaults
      </button>
    </motion.div>
  );
}

// Compact sound toggle for header
export function SoundToggleButton({
  isMuted,
  onClick,
}: {
  isMuted: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      className={`
        p-2 rounded-lg transition-colors
        ${isMuted ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}
      `}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
    </motion.button>
  );
}
