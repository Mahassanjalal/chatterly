import express from 'express';
import { metricsService } from '../services/metrics.service';
import { advancedMatchingService } from '../services/advanced-matching.service';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * GET /api/analytics/dashboard
 * Get dashboard data for admin/analytics view
 */
router.get('/dashboard', async (req:any, res:any) => {
  try {
    const dashboardData = metricsService.getDashboardData();
    const matchingMetrics = advancedMatchingService.getMetrics();
    
    res.json({
      success: true,
      data: {
        ...dashboardData,
        matching: matchingMetrics,
      },
    });
  } catch (error) {
    logger.error('Error getting dashboard data:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard data' });
  }
});

/**
 * GET /api/analytics/metrics
 * Get Prometheus-formatted metrics
 */
router.get('/metrics', async (req:any, res:any) => {
  try {
    const metrics = metricsService.getPrometheusMetrics();
    res.type('text/plain').send(metrics);
  } catch (error) {
    logger.error('Error getting metrics:', error);
    res.status(500).send('# Error getting metrics');
  }
});

/**
 * GET /api/analytics/health
 * Health check endpoint with detailed status
 */
router.get('/health', async (req:any, res:any) => {
  try {
    const dashboard = metricsService.getDashboardData();
    
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: dashboard.health.uptime,
      memory: {
        usage: dashboard.health.memoryUsage,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
      },
      performance: {
        errorRate: dashboard.health.errorRate,
        p95Latency: dashboard.health.p95Latency,
      },
      connections: {
        activeUsers: dashboard.realtime.activeUsers,
        activeMatches: dashboard.realtime.activeMatches,
        queueSize: dashboard.realtime.queueSize,
      },
    };

    // Determine overall health
    if (dashboard.health.errorRate > 0.1) {
      status.status = 'degraded';
    }
    if (dashboard.health.memoryUsage > 0.9) {
      status.status = 'warning';
    }

    res.json(status);
  } catch (error) {
    logger.error('Error in health check:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

/**
 * GET /api/analytics/queue-stats
 * Get current queue statistics
 */
router.get('/queue-stats', async (req:any, res:any) => {
  try {
    const queueStats = advancedMatchingService.getQueueStats();
    const dashboardData = metricsService.getDashboardData();
    
    res.json({
      success: true,
      data: {
        ...queueStats,
        averageWaitTime: dashboardData.realtime.averageWaitTime,
        messageRate: dashboardData.realtime.messageRate,
      },
    });
  } catch (error) {
    logger.error('Error getting queue stats:', error);
    res.status(500).json({ success: false, message: 'Failed to get queue stats' });
  }
});

export default router;
