import { getMongoDBHealth } from '../config/mongodb';
import { cacheService } from './cache.service';
import { metricsService } from './metrics.service';
import os from 'os';

/**
 * Health Check Service
 * Comprehensive health monitoring for production environments
 * Designed for load balancer integration and Kubernetes probes
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: HealthCheckResult[];
  metrics?: SystemMetrics;
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  responseTime?: number;
  details?: Record<string, unknown>;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  connections: {
    active: number;
    peak: number;
  };
  requests: {
    total: number;
    rate: number;
  };
}

// Service start time
const startTime = Date.now();

export class HealthService {
  private peakConnections = 0;
  private totalRequests = 0;
  private lastRequestTime = Date.now();
  
  /**
   * Get simple liveness check (for Kubernetes liveness probes)
   */
  async getLiveness(): Promise<{ status: 'ok' | 'error' }> {
    return { status: 'ok' };
  }

  /**
   * Get readiness check (for Kubernetes readiness probes)
   */
  async getReadiness(): Promise<{ status: 'ready' | 'not_ready'; checks: HealthCheckResult[] }> {
    const checks: HealthCheckResult[] = [];
    
    // Check MongoDB
    const mongoCheck = await this.checkMongoDB();
    checks.push(mongoCheck);
    
    // Check Redis
    const redisCheck = await this.checkRedis();
    checks.push(redisCheck);
    
    const allPassed = checks.every(c => c.status === 'pass');
    
    return {
      status: allPassed ? 'ready' : 'not_ready',
      checks,
    };
  }

  /**
   * Get comprehensive health status
   */
  async getHealth(includeMetrics = false): Promise<HealthStatus> {
    const checks: HealthCheckResult[] = [];
    
    // Database checks
    checks.push(await this.checkMongoDB());
    checks.push(await this.checkRedis());
    
    // Service checks
    checks.push(await this.checkMemory());
    checks.push(this.checkCPU());
    checks.push(await this.checkCache());
    
    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warnChecks = checks.filter(c => c.status === 'warn');
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warnChecks.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - startTime) / 1000,
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };
    
    if (includeMetrics) {
      healthStatus.metrics = this.getSystemMetrics();
    }
    
    return healthStatus;
  }

  /**
   * Check MongoDB health
   */
  private async checkMongoDB(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const health = getMongoDBHealth();
      const responseTime = Date.now() - start;
      
      return {
        name: 'mongodb',
        status: health.connected ? 'pass' : 'fail',
        message: health.connected ? 'Connected' : 'Disconnected',
        responseTime,
        details: {
          host: health.host,
          readyState: health.readyState,
        },
      };
    } catch (error) {
      return {
        name: 'mongodb',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      const healthy = await cacheService.healthCheck();
      const responseTime = Date.now() - start;
      const stats = await cacheService.getStats();
      
      return {
        name: 'redis',
        status: healthy ? 'pass' : 'fail',
        message: healthy ? 'Connected' : 'Disconnected',
        responseTime,
        details: {
          memoryUsed: stats.memoryUsed,
          connectedClients: stats.connectedClients,
        },
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheckResult> {
    const usage = process.memoryUsage();
    const heapUsedPercentage = (usage.heapUsed / usage.heapTotal) * 100;
    
    let status: 'pass' | 'warn' | 'fail';
    if (heapUsedPercentage > 90) {
      status = 'fail';
    } else if (heapUsedPercentage > 75) {
      status = 'warn';
    } else {
      status = 'pass';
    }
    
    return {
      name: 'memory',
      status,
      message: `Heap usage: ${heapUsedPercentage.toFixed(1)}%`,
      details: {
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        rss: Math.round(usage.rss / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024),
      },
    };
  }

  /**
   * Check CPU usage (simplified)
   */
  private checkCPU(): HealthCheckResult {
    const cpus = os.cpus();
    const avgLoad = os.loadavg()[0] / cpus.length;
    
    let status: 'pass' | 'warn' | 'fail';
    if (avgLoad > 0.9) {
      status = 'fail';
    } else if (avgLoad > 0.7) {
      status = 'warn';
    } else {
      status = 'pass';
    }
    
    return {
      name: 'cpu',
      status,
      message: `Load average: ${(avgLoad * 100).toFixed(1)}%`,
      details: {
        cores: cpus.length,
        loadAvg: os.loadavg(),
      },
    };
  }

  /**
   * Check cache health
   */
  private async checkCache(): Promise<HealthCheckResult> {
    const start = Date.now();
    
    try {
      // Try a simple cache operation
      const testKey = '__health_check__';
      await cacheService.set(testKey, { test: true }, { ttl: 10, prefix: '' });
      const result = await cacheService.get(testKey, { ttl: 10, prefix: '' });
      await cacheService.delete(testKey, { ttl: 10, prefix: '' });
      
      const responseTime = Date.now() - start;
      
      return {
        name: 'cache',
        status: result ? 'pass' : 'warn',
        message: result ? 'Operational' : 'Cache miss on test',
        responseTime,
      };
    } catch (error) {
      return {
        name: 'cache',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - start,
      };
    }
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): SystemMetrics {
    const usage = process.memoryUsage();
    
    return {
      memory: {
        used: Math.round(usage.heapUsed / 1024 / 1024),
        total: Math.round(usage.heapTotal / 1024 / 1024),
        percentage: (usage.heapUsed / usage.heapTotal) * 100,
      },
      cpu: {
        usage: os.loadavg()[0] / os.cpus().length,
      },
      connections: {
        active: this.peakConnections,
        peak: this.peakConnections,
      },
      requests: {
        total: this.totalRequests,
        rate: this.getRequestRate(),
      },
    };
  }

  /**
   * Track connection for metrics
   */
  trackConnection(count: number): void {
    if (count > this.peakConnections) {
      this.peakConnections = count;
    }
  }

  /**
   * Track request for metrics
   */
  trackRequest(): void {
    this.totalRequests++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Get request rate (requests per minute)
   */
  private getRequestRate(): number {
    const uptimeMinutes = (Date.now() - startTime) / 60000;
    if (uptimeMinutes <= 0.001) return 0; // Handle very small/zero uptime
    return this.totalRequests / uptimeMinutes;
  }

  /**
   * Get detailed dashboard metrics
   */
  async getDashboardMetrics(): Promise<{
    system: SystemMetrics;
    application: ReturnType<typeof metricsService.getDashboardData>;
    cache: Awaited<ReturnType<typeof cacheService.getStats>>;
  }> {
    const [cacheStats, appMetrics] = await Promise.all([
      cacheService.getStats(),
      Promise.resolve(metricsService.getDashboardData()),
    ]);
    
    return {
      system: this.getSystemMetrics(),
      application: appMetrics,
      cache: cacheStats,
    };
  }
}

// Export singleton
export const healthService = new HealthService();
