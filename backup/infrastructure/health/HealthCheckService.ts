/**
 * Health Check Service
 * 
 * Provides health monitoring for application dependencies and services.
 * Implements standard health check patterns for monitoring and alerting.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Container } from '../di/Container'
import { ConfigurationManager } from '../config/ConfigurationManager'

export interface HealthCheckResult {
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  description: string
  duration: number
  timestamp: Date
  details?: Record<string, any>
  error?: string
}

export interface SystemHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: Date
  duration: number
  checks: HealthCheckResult[]
  summary: {
    total: number
    healthy: number
    unhealthy: number
    degraded: number
  }
}

export interface HealthCheck {
  name: string
  description: string
  execute(): Promise<HealthCheckResult>
}

/**
 * Database Health Check
 */
export class DatabaseHealthCheck implements HealthCheck {
  name = 'database'
  description = 'Supabase database connectivity'

  constructor(private supabaseClient: SupabaseClient) {}

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Simple query to test database connectivity
      const { data, error } = await this.supabaseClient
        .from('users')
        .select('count')
        .limit(1)
        .single()

      const duration = Date.now() - startTime

      if (error && error.code !== 'PGRST116') {
        return {
          name: this.name,
          status: 'unhealthy',
          description: this.description,
          duration,
          timestamp: new Date(),
          error: error.message,
          details: { errorCode: error.code }
        }
      }

      return {
        name: this.name,
        status: 'healthy',
        description: this.description,
        duration,
        timestamp: new Date(),
        details: { responseTime: `${duration}ms` }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        name: this.name,
        status: 'unhealthy',
        description: this.description,
        duration,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Container Health Check
 */
export class ContainerHealthCheck implements HealthCheck {
  name = 'container'
  description = 'Dependency injection container'

  constructor(private container: Container) {}

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const healthStatus = this.container.getHealthStatus()
      const duration = Date.now() - startTime

      const status = healthStatus.isHealthy ? 'healthy' : 'unhealthy'

      return {
        name: this.name,
        status,
        description: this.description,
        duration,
        timestamp: new Date(),
        details: {
          servicesCount: healthStatus.servicesCount,
          singletonsCount: healthStatus.singletonsCount,
          scopedServicesCount: healthStatus.scopedServicesCount,
          totalResolutions: healthStatus.totalResolutions,
          errors: healthStatus.errors
        },
        error: healthStatus.errors.length > 0 ? healthStatus.errors.join(', ') : undefined
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        name: this.name,
        status: 'unhealthy',
        description: this.description,
        duration,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Configuration Health Check
 */
export class ConfigurationHealthCheck implements HealthCheck {
  name = 'configuration'
  description = 'Application configuration'

  constructor(private configManager: ConfigurationManager) {}

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const isLoaded = this.configManager.isConfigurationLoaded()
      const config = this.configManager.getConfig()
      const duration = Date.now() - startTime

      const status = isLoaded ? 'healthy' : 'unhealthy'

      return {
        name: this.name,
        status,
        description: this.description,
        duration,
        timestamp: new Date(),
        details: {
          environment: config.environment,
          version: config.version,
          isLoaded
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        name: this.name,
        status: 'unhealthy',
        description: this.description,
        duration,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Memory Health Check
 */
export class MemoryHealthCheck implements HealthCheck {
  name = 'memory'
  description = 'System memory usage'

  async execute(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const memoryUsage = process.memoryUsage()
      const duration = Date.now() - startTime

      // Convert bytes to MB
      const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
      const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
      const rssMB = Math.round(memoryUsage.rss / 1024 / 1024)

      // Consider unhealthy if heap usage is over 80%
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

      if (heapUsagePercent > 90) {
        status = 'unhealthy'
      } else if (heapUsagePercent > 80) {
        status = 'degraded'
      }

      return {
        name: this.name,
        status,
        description: this.description,
        duration,
        timestamp: new Date(),
        details: {
          heapUsedMB,
          heapTotalMB,
          rssMB,
          heapUsagePercent: Math.round(heapUsagePercent)
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        name: this.name,
        status: 'unhealthy',
        description: this.description,
        duration,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Health Check Service
 */
export class HealthCheckService {
  private checks: HealthCheck[] = []

  constructor() {
    this.registerDefaultChecks()
  }

  /**
   * Register a health check
   */
  registerCheck(check: HealthCheck): void {
    this.checks.push(check)
  }

  /**
   * Remove a health check
   */
  removeCheck(name: string): void {
    this.checks = this.checks.filter(check => check.name !== name)
  }

  /**
   * Execute all health checks
   */
  async executeAll(): Promise<SystemHealthStatus> {
    const startTime = Date.now()
    
    const checkPromises = this.checks.map(check => 
      check.execute().catch(error => ({
        name: check.name,
        status: 'unhealthy' as const,
        description: check.description,
        duration: 0,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    )

    const results = await Promise.all(checkPromises)
    const duration = Date.now() - startTime

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      degraded: results.filter(r => r.status === 'degraded').length
    }

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy'
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded'
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      duration,
      checks: results,
      summary
    }
  }

  /**
   * Execute a specific health check
   */
  async executeCheck(name: string): Promise<HealthCheckResult | null> {
    const check = this.checks.find(c => c.name === name)
    if (!check) {
      return null
    }

    return check.execute()
  }

  /**
   * Get all registered checks
   */
  getRegisteredChecks(): Array<{ name: string; description: string }> {
    return this.checks.map(check => ({
      name: check.name,
      description: check.description
    }))
  }

  /**
   * Register default health checks
   */
  private registerDefaultChecks(): void {
    // These will be registered when the service is initialized with dependencies
  }

  /**
   * Initialize with dependencies
   */
  static create(container: Container): HealthCheckService {
    const service = new HealthCheckService()
    
    try {
      // Register database health check
      const supabaseClient = container.resolve('supabaseClient')
      service.registerCheck(new DatabaseHealthCheck(supabaseClient))
    } catch (error) {
      console.warn('Could not register database health check:', error)
    }

    try {
      // Register container health check
      service.registerCheck(new ContainerHealthCheck(container))
    } catch (error) {
      console.warn('Could not register container health check:', error)
    }

    try {
      // Register configuration health check
      const configManager = ConfigurationManager.getInstance()
      service.registerCheck(new ConfigurationHealthCheck(configManager))
    } catch (error) {
      console.warn('Could not register configuration health check:', error)
    }

    // Register memory health check
    service.registerCheck(new MemoryHealthCheck())

    return service
  }
}
