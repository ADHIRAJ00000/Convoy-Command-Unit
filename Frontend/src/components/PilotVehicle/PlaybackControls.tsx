// Playback Controls for Pilot Vehicle Simulation
// Control simulation speed and playback state

import React from 'react';
import { Play, Pause, FastForward, SkipBack, SkipForward } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  speed: 0.5 | 1 | 2 | 4;
  onPlayPause: () => void;
  onSpeedChange: (speed: 0.5 | 1 | 2 | 4) => void;
  onReset?: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  speed,
  onPlayPause,
  onSpeedChange,
  onReset,
}) => {
  const speedOptions: Array<0.5 | 1 | 2 | 4> = [0.5, 1, 2, 4];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        {/* Reset Button */}
        {onReset && (
          <button
            onClick={onReset}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            title="Reset Simulation"
          >
            <SkipBack className="w-5 h-5" />
          </button>
        )}

        {/* Play/Pause Button */}
        <button
          onClick={onPlayPause}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>START</span>
            </>
          )}
        </button>

        {/* Speed Controls */}
        <div className="flex items-center gap-2">
          <FastForward className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-400 font-semibold mr-2">SPEED:</span>
          <div className="flex gap-2">
            {speedOptions.map((speedOption) => (
              <button
                key={speedOption}
                onClick={() => onSpeedChange(speedOption)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  speed === speedOption
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {speedOption}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 flex items-center justify-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-slate-400">
          {isPlaying ? 'Simulation Running' : 'Simulation Paused'} • {speed}× Speed
        </span>
      </div>
    </div>
  );
};
