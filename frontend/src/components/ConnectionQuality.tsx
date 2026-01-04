"use client";

import { useEffect, useState } from "react";

type Quality = 'excellent' | 'good' | 'fair' | 'poor';

interface ConnectionQualityProps {
  peerConnection?: RTCPeerConnection | null;
}

export default function ConnectionQuality({ peerConnection }: ConnectionQualityProps) {
  const [quality, setQuality] = useState<Quality>('good');
  const [latency, setLatency] = useState<number>(0);
  const [bandwidth, setBandwidth] = useState<number>(0);

  useEffect(() => {
    if (!peerConnection) return;

    const checkQuality = async () => {
      try {
        const stats = await peerConnection.getStats();
        let totalPacketsLost = 0;
        let totalPackets = 0;
        let currentLatency = 0;
        let currentBandwidth = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            totalPacketsLost += report.packetsLost || 0;
            totalPackets += report.packetsReceived || 0;
            currentBandwidth = Math.round((report.bytesReceived || 0) / 1024);
          }

          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            currentLatency = report.currentRoundTripTime ? Math.round(report.currentRoundTripTime * 1000) : 0;
          }
        });

        setLatency(currentLatency);
        setBandwidth(currentBandwidth);

        const packetLossRate = totalPackets > 0 ? (totalPacketsLost / totalPackets) * 100 : 0;

        if (currentLatency < 50 && packetLossRate < 1) {
          setQuality('excellent');
        } else if (currentLatency < 150 && packetLossRate < 3) {
          setQuality('good');
        } else if (currentLatency < 300 && packetLossRate < 5) {
          setQuality('fair');
        } else {
          setQuality('poor');
        }
      } catch (error) {
        console.error('Error checking connection quality:', error);
      }
    };

    const interval = setInterval(checkQuality, 2000);
    return () => clearInterval(interval);
  }, [peerConnection]);

  const qualityConfig = {
    excellent: {
      color: 'text-green-500',
      bgColor: 'bg-green-100',
      label: 'Excellent',
      bars: 4,
    },
    good: {
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      label: 'Good',
      bars: 3,
    },
    fair: {
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      label: 'Fair',
      bars: 2,
    },
    poor: {
      color: 'text-red-500',
      bgColor: 'bg-red-100',
      label: 'Poor',
      bars: 1,
    },
  };

  const config = qualityConfig[quality];

  return (
    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
      {/* Signal Bars */}
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1.5 rounded-sm transition-all duration-300 ${
              bar <= config.bars ? config.color : 'bg-gray-300'
            }`}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>

      {/* Quality Label */}
      <div className="flex flex-col">
        <span className={`text-xs font-semibold ${config.color}`}>
          {config.label}
        </span>
        {latency > 0 && (
          <span className="text-xs text-gray-500">
            {latency}ms
          </span>
        )}
      </div>

      {/* Tooltip on hover */}
      <div className="relative group">
        <svg 
          className="w-4 h-4 text-gray-400 cursor-help" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <p className="font-semibold mb-1">Connection Info</p>
          <p>Quality: {config.label}</p>
          <p>Latency: {latency}ms</p>
          {bandwidth > 0 && <p>Bandwidth: {bandwidth}KB/s</p>}
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      </div>
    </div>
  );
}
