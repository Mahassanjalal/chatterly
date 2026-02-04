/**
 * Adaptive Quality Controller
 * Manages video quality based on network conditions and user subscription
 */

export interface QualityLevel {
  width: number;
  height: number;
  bitrate: number;
  frameRate: number;
  label: string;
}

export const QUALITY_LEVELS: QualityLevel[] = [
  { width: 320, height: 240, bitrate: 150000, frameRate: 15, label: '240p' },
  { width: 640, height: 480, bitrate: 500000, frameRate: 24, label: '480p' },
  { width: 1280, height: 720, bitrate: 1500000, frameRate: 30, label: '720p' },
  { width: 1920, height: 1080, bitrate: 4000000, frameRate: 30, label: '1080p' },
];

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export interface NetworkStats {
  bandwidth: number; // bits per second
  latency: number; // milliseconds
  packetLoss: number; // 0-1 percentage
  jitter?: number;
}

export class AdaptiveQualityController {
  private currentQuality: QualityLevel;
  private maxQuality: QualityLevel;
  private statsHistory: NetworkStats[] = [];
  private maxHistorySize = 10;
  private onQualityChange?: (quality: QualityLevel) => void;
  private peer?: RTCPeerConnection;

  constructor(maxQualityLabel: '480p' | '720p' | '1080p' = '1080p') {
    this.maxQuality = QUALITY_LEVELS.find(l => l.label === maxQualityLabel) || QUALITY_LEVELS[3];
    this.currentQuality = QUALITY_LEVELS[1]; // Start with 480p
  }

  /**
   * Set the peer connection to monitor
   */
  setPeerConnection(pc: RTCPeerConnection): void {
    this.peer = pc;
    this.startMonitoring();
  }

  /**
   * Set callback for quality changes
   */
  setOnQualityChange(callback: (quality: QualityLevel) => void): void {
    this.onQualityChange = callback;
  }

  /**
   * Start monitoring connection statistics
   */
  private startMonitoring(): void {
    if (!this.peer) return;

    const collectStats = async () => {
      if (!this.peer || this.peer.connectionState === 'closed') return;

      try {
        const stats = await this.peer.getStats();
        const networkStats = this.extractNetworkStats(stats);
        
        if (networkStats) {
          this.addStats(networkStats);
          await this.adjustQuality();
        }
      } catch (error) {
        console.warn('Failed to collect stats:', error);
      }
    };

    // Collect stats every 2 seconds
    const interval = setInterval(collectStats, 2000);

    // Clear interval when peer connection closes
    this.peer.addEventListener('connectionstatechange', () => {
      if (this.peer?.connectionState === 'closed' || this.peer?.connectionState === 'failed') {
        clearInterval(interval);
      }
    });
  }

  /**
   * Extract network statistics from RTCStatsReport
   */
  private extractNetworkStats(stats: RTCStatsReport): NetworkStats | null {
    let bandwidth = 0;
    let latency = 0;
    let packetLoss = 0;
    let jitter = 0;
    let hasData = false;

    stats.forEach((report) => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        if (report.availableOutgoingBitrate) {
          bandwidth = report.availableOutgoingBitrate;
          hasData = true;
        }
        if (report.currentRoundTripTime) {
          latency = report.currentRoundTripTime * 1000; // Convert to ms
        }
      }

      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        if (report.packetsLost !== undefined && report.packetsSent) {
          packetLoss = report.packetsLost / (report.packetsLost + report.packetsSent);
        }
      }

      if (report.type === 'remote-inbound-rtp') {
        if (report.jitter) {
          jitter = report.jitter * 1000; // Convert to ms
        }
      }
    });

    if (!hasData) return null;

    return { bandwidth, latency, packetLoss, jitter };
  }

  /**
   * Add stats to history
   */
  private addStats(stats: NetworkStats): void {
    this.statsHistory.push(stats);
    if (this.statsHistory.length > this.maxHistorySize) {
      this.statsHistory.shift();
    }
  }

  /**
   * Get averaged stats from history
   */
  private getAveragedStats(): NetworkStats {
    if (this.statsHistory.length === 0) {
      return { bandwidth: 0, latency: 0, packetLoss: 0 };
    }

    const sum = this.statsHistory.reduce(
      (acc, stats) => ({
        bandwidth: acc.bandwidth + stats.bandwidth,
        latency: acc.latency + stats.latency,
        packetLoss: acc.packetLoss + stats.packetLoss,
        jitter: (acc.jitter || 0) + (stats.jitter || 0),
      }),
      { bandwidth: 0, latency: 0, packetLoss: 0, jitter: 0 }
    );

    const count = this.statsHistory.length;
    return {
      bandwidth: sum.bandwidth / count,
      latency: sum.latency / count,
      packetLoss: sum.packetLoss / count,
      jitter: sum.jitter ? sum.jitter / count : undefined,
    };
  }

  /**
   * Adjust video quality based on network conditions
   */
  private async adjustQuality(): Promise<void> {
    const stats = this.getAveragedStats();
    const optimalQuality = this.calculateOptimalQuality(stats);

    if (optimalQuality.label !== this.currentQuality.label) {
      this.currentQuality = optimalQuality;
      this.onQualityChange?.(optimalQuality);
      await this.applyQualityConstraints();
    }
  }

  /**
   * Calculate optimal quality level based on bandwidth
   */
  private calculateOptimalQuality(stats: NetworkStats): QualityLevel {
    const maxIndex = QUALITY_LEVELS.findIndex(l => l.label === this.maxQuality.label);
    const allowedLevels = QUALITY_LEVELS.slice(0, maxIndex + 1);

    // Use 80% of available bandwidth as target
    const targetBitrate = stats.bandwidth * 0.8;

    // Find the highest quality that fits
    for (let i = allowedLevels.length - 1; i >= 0; i--) {
      if (allowedLevels[i].bitrate <= targetBitrate) {
        // Additional checks for latency and packet loss
        if (stats.latency > 200 && i > 1) {
          return allowedLevels[i - 1]; // Reduce quality for high latency
        }
        if (stats.packetLoss > 0.05 && i > 1) {
          return allowedLevels[i - 1]; // Reduce quality for high packet loss
        }
        return allowedLevels[i];
      }
    }

    return QUALITY_LEVELS[0]; // Fallback to lowest
  }

  /**
   * Apply quality constraints to video sender
   */
  private async applyQualityConstraints(): Promise<void> {
    if (!this.peer) return;

    const senders = this.peer.getSenders();
    const videoSender = senders.find(s => s.track?.kind === 'video');

    if (!videoSender) return;

    const params = videoSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }

    params.encodings[0].maxBitrate = this.currentQuality.bitrate;
    params.encodings[0].maxFramerate = this.currentQuality.frameRate;

    try {
      await videoSender.setParameters(params);
      console.log(`Quality adjusted to ${this.currentQuality.label}`);
    } catch (error) {
      console.warn('Failed to apply quality constraints:', error);
    }
  }

  /**
   * Evaluate connection quality
   */
  evaluateConnectionQuality(): ConnectionQuality {
    const stats = this.getAveragedStats();

    if (stats.bandwidth <= 0) return 'disconnected';

    if (stats.bandwidth >= 2000000 && stats.latency <= 50 && stats.packetLoss <= 0.01) {
      return 'excellent';
    }
    if (stats.bandwidth >= 1000000 && stats.latency <= 100 && stats.packetLoss <= 0.03) {
      return 'good';
    }
    if (stats.bandwidth >= 500000 && stats.latency <= 200 && stats.packetLoss <= 0.05) {
      return 'fair';
    }
    return 'poor';
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * Get current network stats
   */
  getNetworkStats(): NetworkStats | null {
    if (this.statsHistory.length === 0) return null;
    return this.getAveragedStats();
  }

  /**
   * Get video constraints for the current quality
   */
  getVideoConstraints(): MediaTrackConstraints {
    return {
      width: { ideal: this.currentQuality.width },
      height: { ideal: this.currentQuality.height },
      frameRate: { ideal: this.currentQuality.frameRate },
    };
  }

  /**
   * Reset controller
   */
  reset(): void {
    this.statsHistory = [];
    this.currentQuality = QUALITY_LEVELS[1];
    this.peer = undefined;
  }
}

// Export singleton instance
export const adaptiveQualityController = new AdaptiveQualityController();
