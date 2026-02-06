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
    color: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    label: 'Excellent',
    bars: 4,
  },
  good: {
    color: 'bg-cyan-400',
    textColor: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    label: 'Good',
    bars: 3,
  },
  fair: {
    color: 'bg-amber-400',
    textColor: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    label: 'Fair',
    bars: 2,
  },
  poor: {
    color: 'bg-rose-400',
    textColor: 'text-rose-400',
    bgColor: 'bg-rose-500/20',
    label: 'Poor',
    bars: 1,
  },
  disconnected: {
    color: 'bg-slate-500',
    textColor: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
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
              bar <= config.bars ? config.color : 'bg-slate-600'
            }`}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
      
      {showDetails && (
        <div className="text-xs">
          <span className={config.textColor}>{config.label}</span>
          {currentQuality && (
            <span className="text-slate-500 ml-1">({currentQuality.label})</span>
          )}
          {latency !== undefined && (
            <span className="text-slate-500 ml-1">
              {latency.toFixed(0)}ms
            </span>
          )}
        </div>
      )}
    </div>
  );
}
