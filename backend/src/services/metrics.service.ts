import { logger } from '../config/logger';

/**
 * Real-Time Analytics & Monitoring Service
 * Provides metrics collection, dashboard data, and performance monitoring
 */

// Time series data point
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

// Dashboard data structure
export interface DashboardData {
  realtime: {
    activeUsers: number;
    activeMatches: number;
    queueSize: number;
    averageWaitTime: number;
    messageRate: number;
    videoCallsActive: number;
  };
  trends: {
    hourlyUsers: TimeSeriesDataPoint[];
    matchSuccessRate: TimeSeriesDataPoint[];
    reportRate: TimeSeriesDataPoint[];
    averageSessionDuration: TimeSeriesDataPoint[];
  };
  health: {
    serverLoad: number;
    memoryUsage: number;
    errorRate: number;
    p95Latency: number;
    uptime: number;
  };
  performance: {
    matchLatencyP50: number;
    matchLatencyP95: number;
    messageLatencyP50: number;
    messageLatencyP95: number;
    videoConnectionSuccessRate: number;
  };
}

// Metric types
type MetricType = 'counter' | 'gauge' | 'histogram';

interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: Date;
}

// Histogram bucket
interface HistogramBucket {
  le: number;
  count: number;
}

// Histogram data
interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export class MetricsService {
  // Counters
  private counters: Map<string, number> = new Map();
  
  // Gauges (current values)
  private gauges: Map<string, number> = new Map();
  
  // Histograms
  private histograms: Map<string, HistogramData> = new Map();
  
  // Time series data (for trends)
  private timeSeries: Map<string, TimeSeriesDataPoint[]> = new Map();
  
  // Default histogram buckets for latency measurements
  private latencyBuckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  
  // Server start time for uptime calculation
  private startTime = Date.now();

  constructor() {
    // Initialize default metrics
    this.initializeMetrics();
    
    // Start background aggregation
    this.startAggregation();
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): void {
    // Counters
    this.counters.set('total_connections', 0);
    this.counters.set('total_matches', 0);
    this.counters.set('total_messages', 0);
    this.counters.set('total_reports', 0);
    this.counters.set('total_disconnects', 0);
    this.counters.set('total_errors', 0);
    this.counters.set('moderation_actions', 0);
    
    // Gauges
    this.gauges.set('active_users', 0);
    this.gauges.set('active_matches', 0);
    this.gauges.set('queue_size', 0);
    this.gauges.set('video_calls_active', 0);
    
    // Histograms
    this.initializeHistogram('match_latency_ms');
    this.initializeHistogram('message_latency_ms');
    this.initializeHistogram('video_connection_time_ms');
    this.initializeHistogram('session_duration_seconds');
    
    // Time series
    this.timeSeries.set('hourly_users', []);
    this.timeSeries.set('match_success_rate', []);
    this.timeSeries.set('report_rate', []);
    this.timeSeries.set('avg_session_duration', []);
  }

  /**
   * Initialize a histogram with default buckets
   */
  private initializeHistogram(name: string): void {
    this.histograms.set(name, {
      buckets: this.latencyBuckets.map(le => ({ le, count: 0 })),
      sum: 0,
      count: 0,
    });
  }

  /**
   * Start background aggregation for time series
   */
  private startAggregation(): void {
    // Aggregate hourly data every minute
    setInterval(() => {
      this.aggregateTimeSeries();
    }, 60000);
    
    // Clean up old time series data every hour
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000);
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  /**
   * Increment a gauge value
   */
  incrementGauge(name: string, value: number = 1): void {
    const current = this.gauges.get(name) || 0;
    this.gauges.set(name, current + value);
  }

  /**
   * Decrement a gauge value
   */
  decrementGauge(name: string, value: number = 1): void {
    const current = this.gauges.get(name) || 0;
    this.gauges.set(name, Math.max(0, current - value));
  }

  /**
   * Record a histogram observation
   */
  recordHistogram(name: string, value: number): void {
    const histogram = this.histograms.get(name);
    if (!histogram) {
      logger.warn(`Histogram ${name} not found`);
      return;
    }

    histogram.sum += value;
    histogram.count += 1;

    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count += 1;
      }
    }
  }

  /**
   * Track user connection
   */
  trackUserConnection(userId: string): void {
    this.incrementCounter('total_connections');
    this.incrementGauge('active_users');
    logger.debug(`User connected: ${userId}, active users: ${this.gauges.get('active_users')}`);
  }

  /**
   * Track user disconnection
   */
  trackUserDisconnection(userId: string, sessionDuration?: number): void {
    this.incrementCounter('total_disconnects');
    this.decrementGauge('active_users');
    
    if (sessionDuration) {
      this.recordHistogram('session_duration_seconds', sessionDuration / 1000);
    }
    
    logger.debug(`User disconnected: ${userId}, active users: ${this.gauges.get('active_users')}`);
  }

  /**
   * Track match creation
   */
  trackMatchCreated(matchLatencyMs: number): void {
    this.incrementCounter('total_matches');
    this.incrementGauge('active_matches');
    this.recordHistogram('match_latency_ms', matchLatencyMs);
  }

  /**
   * Track match ended
   */
  trackMatchEnded(): void {
    this.decrementGauge('active_matches');
  }

  /**
   * Track message sent
   */
  trackMessageSent(latencyMs?: number): void {
    this.incrementCounter('total_messages');
    if (latencyMs) {
      this.recordHistogram('message_latency_ms', latencyMs);
    }
  }

  /**
   * Track video call
   */
  trackVideoCallStarted(connectionTimeMs: number): void {
    this.incrementGauge('video_calls_active');
    this.recordHistogram('video_connection_time_ms', connectionTimeMs);
  }

  /**
   * Track video call ended
   */
  trackVideoCallEnded(): void {
    this.decrementGauge('video_calls_active');
  }

  /**
   * Track user report
   */
  trackReport(): void {
    this.incrementCounter('total_reports');
  }

  /**
   * Track error
   */
  trackError(errorType?: string): void {
    this.incrementCounter('total_errors');
    if (errorType) {
      this.incrementCounter(`errors_${errorType}`);
    }
  }

  /**
   * Track moderation action
   */
  trackModerationAction(action: string): void {
    this.incrementCounter('moderation_actions');
    this.incrementCounter(`moderation_${action}`);
  }

  /**
   * Update queue size
   */
  updateQueueSize(size: number): void {
    this.setGauge('queue_size', size);
  }

  /**
   * Get histogram percentile
   */
  getPercentile(histogramName: string, percentile: number): number {
    const histogram = this.histograms.get(histogramName);
    if (!histogram || histogram.count === 0) return 0;

    const targetCount = histogram.count * (percentile / 100);
    
    for (const bucket of histogram.buckets) {
      if (bucket.count >= targetCount) {
        return bucket.le;
      }
    }
    
    return histogram.buckets[histogram.buckets.length - 1].le;
  }

  /**
   * Aggregate time series data
   */
  private aggregateTimeSeries(): void {
    const now = new Date();
    
    // Add current active users to hourly trend
    this.addTimeSeriesPoint('hourly_users', this.gauges.get('active_users') || 0);
    
    // Calculate match success rate (matches / connections)
    const connections = this.counters.get('total_connections') || 1;
    const matches = this.counters.get('total_matches') || 0;
    this.addTimeSeriesPoint('match_success_rate', (matches * 2) / connections);
    
    // Calculate report rate
    const reports = this.counters.get('total_reports') || 0;
    this.addTimeSeriesPoint('report_rate', reports / connections);
    
    // Average session duration
    const sessionHistogram = this.histograms.get('session_duration_seconds');
    if (sessionHistogram && sessionHistogram.count > 0) {
      this.addTimeSeriesPoint('avg_session_duration', sessionHistogram.sum / sessionHistogram.count);
    }
  }

  /**
   * Add a point to time series
   */
  private addTimeSeriesPoint(name: string, value: number): void {
    const series = this.timeSeries.get(name);
    if (series) {
      series.push({
        timestamp: new Date(),
        value,
      });
    }
  }

  /**
   * Clean up old time series data (keep last 24 hours)
   */
  private cleanupOldData(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [name, series] of this.timeSeries) {
      const filtered = series.filter(point => point.timestamp.getTime() > cutoff);
      this.timeSeries.set(name, filtered);
    }
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): DashboardData {
    return {
      realtime: {
        activeUsers: this.gauges.get('active_users') || 0,
        activeMatches: this.gauges.get('active_matches') || 0,
        queueSize: this.gauges.get('queue_size') || 0,
        averageWaitTime: this.getAverageWaitTime(),
        messageRate: this.getMessageRate(),
        videoCallsActive: this.gauges.get('video_calls_active') || 0,
      },
      trends: {
        hourlyUsers: this.timeSeries.get('hourly_users') || [],
        matchSuccessRate: this.timeSeries.get('match_success_rate') || [],
        reportRate: this.timeSeries.get('report_rate') || [],
        averageSessionDuration: this.timeSeries.get('avg_session_duration') || [],
      },
      health: {
        serverLoad: this.getServerLoad(),
        memoryUsage: this.getMemoryUsage(),
        errorRate: this.getErrorRate(),
        p95Latency: this.getPercentile('match_latency_ms', 95),
        uptime: (Date.now() - this.startTime) / 1000,
      },
      performance: {
        matchLatencyP50: this.getPercentile('match_latency_ms', 50),
        matchLatencyP95: this.getPercentile('match_latency_ms', 95),
        messageLatencyP50: this.getPercentile('message_latency_ms', 50),
        messageLatencyP95: this.getPercentile('message_latency_ms', 95),
        videoConnectionSuccessRate: this.getVideoConnectionSuccessRate(),
      },
    };
  }

  /**
   * Calculate average wait time
   */
  private getAverageWaitTime(): number {
    const histogram = this.histograms.get('match_latency_ms');
    if (!histogram || histogram.count === 0) return 0;
    return histogram.sum / histogram.count;
  }

  /**
   * Calculate message rate (messages per minute)
   */
  private getMessageRate(): number {
    const messages = this.counters.get('total_messages') || 0;
    const uptimeMinutes = (Date.now() - this.startTime) / 60000;
    if (uptimeMinutes === 0) return 0;
    return messages / uptimeMinutes;
  }

  /**
   * Get server load (simplified)
   */
  private getServerLoad(): number {
    // In a real implementation, you'd use os.loadavg() or similar
    const activeUsers = this.gauges.get('active_users') || 0;
    // Assume 1000 users is 100% load
    return Math.min(activeUsers / 1000, 1);
  }

  /**
   * Get memory usage
   */
  private getMemoryUsage(): number {
    const used = process.memoryUsage();
    // Return heap used as percentage of heap total
    return used.heapUsed / used.heapTotal;
  }

  /**
   * Get error rate
   */
  private getErrorRate(): number {
    const errors = this.counters.get('total_errors') || 0;
    const connections = this.counters.get('total_connections') || 1;
    return errors / connections;
  }

  /**
   * Get video connection success rate
   */
  private getVideoConnectionSuccessRate(): number {
    // Simplified calculation
    const matches = this.counters.get('total_matches') || 0;
    const errors = this.counters.get('errors_video') || 0;
    if (matches === 0) return 1;
    return 1 - (errors / matches);
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Counters
    for (const [name, value] of this.counters) {
      lines.push(`# TYPE chatterly_${name} counter`);
      lines.push(`chatterly_${name} ${value}`);
    }
    
    // Gauges
    for (const [name, value] of this.gauges) {
      lines.push(`# TYPE chatterly_${name} gauge`);
      lines.push(`chatterly_${name} ${value}`);
    }
    
    // Histograms
    for (const [name, histogram] of this.histograms) {
      lines.push(`# TYPE chatterly_${name} histogram`);
      for (const bucket of histogram.buckets) {
        lines.push(`chatterly_${name}_bucket{le="${bucket.le}"} ${bucket.count}`);
      }
      lines.push(`chatterly_${name}_bucket{le="+Inf"} ${histogram.count}`);
      lines.push(`chatterly_${name}_sum ${histogram.sum}`);
      lines.push(`chatterly_${name}_count ${histogram.count}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.timeSeries.clear();
    this.initializeMetrics();
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
