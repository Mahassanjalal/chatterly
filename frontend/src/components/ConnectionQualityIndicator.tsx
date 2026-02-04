"use client";

import React from 'react';
import type { ConnectionQuality, QualityLevel } from '../utils/adaptive-quality';

interface ConnectionQualityIndicatorProps {
  quality: ConnectionQuality;
  currentQuality?: QualityLevel;
  latency?: number;
  showDetails?: boolean;
}

const qualityConfig = {
  excellent: {
    color: 'bg-green-500',
    textColor: 'text-green-500',
    label: 'Excellent',
    bars: 4,
  },
  good: {
    color: 'bg-green-400',
    textColor: 'text-green-400',
    label: 'Good',
    bars: 3,
  },
  fair: {
    color: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    label: 'Fair',
    bars: 2,
  },
  poor: {
    color: 'bg-red-400',
    textColor: 'text-red-400',
    label: 'Poor',
    bars: 1,
  },
  disconnected: {
    color: 'bg-gray-400',
    textColor: 'text-gray-400',
    label: 'Disconnected',
    bars: 0,
  },
};

export default function ConnectionQualityIndicator({
  quality,
  currentQuality,
  latency,
  showDetails = false,
}: ConnectionQualityIndicatorProps) {
  const config = qualityConfig[quality];
  
  return (
    <div className="flex items-center gap-2">
      {/* Signal Bars */}
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 rounded-sm transition-all ${
              bar <= config.bars ? config.color : 'bg-gray-300'
            }`}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
      
      {showDetails && (
        <div className="text-xs">
          <span className={config.textColor}>{config.label}</span>
          {currentQuality && (
            <span className="text-gray-400 ml-1">({currentQuality.label})</span>
          )}
          {latency !== undefined && (
            <span className="text-gray-400 ml-1">
              {latency.toFixed(0)}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
}
