import { Router } from 'express';
import { healthService } from '../services/health.service';
import { metricsService } from '../services/metrics.service';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route GET /health
 * @desc Basic health check
 * @access Public
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const health = await healthService.getHealth(false);
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  })
);

/**
 * @route GET /health/live
 * @desc Kubernetes liveness probe
 * @access Public
 */
router.get(
  '/live',
  asyncHandler(async (req, res) => {
    const liveness = await healthService.getLiveness();
    res.json(liveness);
  })
);

/**
 * @route GET /health/ready
 * @desc Kubernetes readiness probe
 * @access Public
 */
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    const readiness = await healthService.getReadiness();
    const statusCode = readiness.status === 'ready' ? 200 : 503;
    res.status(statusCode).json(readiness);
  })
);

/**
 * @route GET /health/detailed
 * @desc Detailed health status with metrics
 * @access Public (should be restricted in production)
 */
router.get(
  '/detailed',
  asyncHandler(async (req, res) => {
    const health = await healthService.getHealth(true);
    res.json(health);
  })
);

/**
 * @route GET /health/metrics
 * @desc Get Prometheus-style metrics
 * @access Public (should be restricted in production)
 */
router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const metrics = metricsService.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  })
);

/**
 * @route GET /health/dashboard
 * @desc Get comprehensive dashboard metrics
 * @access Public (should be restricted in production)
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const dashboard = await healthService.getDashboardMetrics();
    res.json(dashboard);
  })
);

export default router;
