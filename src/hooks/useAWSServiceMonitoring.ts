import { useState, useEffect, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { api } from '../lib/api';

export interface AWSService {
  id: string;
  name: string;
  icon: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  region: string;
  metrics: {
    invocations?: number;
    errors?: number;
    duration?: number;
    memory?: number;
    storage?: number;
    cost?: number;
  };
  lastUpdated: Date;
}

export interface CloudWatchLog {
  id: string;
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  service: string;
  message: string;
  requestId?: string;
}

export interface StepFunctionExecution {
  id: string;
  name: string;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: any;
  output?: any;
}

// Disabled for free tier - AWS Service Metrics API is commented out
// const awsServicesFetcher = () => api.getAWSServiceMetrics();
const awsServicesFetcher = async () => {
  // Return empty data structure when API is disabled
  return { services: [] };
};

// Disabled for free tier - CloudWatch Logs API is commented out
// const cloudWatchLogsFetcher = () => api.getCloudWatchLogs(undefined, 20);
const cloudWatchLogsFetcher = async () => {
  // Return empty data structure when API is disabled
  return { logs: [] };
};

const stepFunctionExecutionsFetcher = () => api.getStepFunctionExecutions(25);

export const useAWSServiceMonitoring = () => {
  const [isLive, setIsLive] = useState(true);

  const { 
    data: awsServicesData, 
    error: awsServicesError, 
    isLoading: awsServicesLoading 
  } = useSWR('aws-services', awsServicesFetcher, {
    refreshInterval: isLive ? 5000 : 0,
    revalidateOnFocus: false
  });

  const { 
    data: logsData, 
    error: logsError, 
    isLoading: logsLoading 
  } = useSWR('cloudwatch-logs', cloudWatchLogsFetcher, {
    refreshInterval: isLive ? 10000 : 0,
    revalidateOnFocus: false
  });

  const {
    data: executionsData,
    error: executionsError,
    isLoading: executionsLoading
  } = useSWR('step-function-executions', stepFunctionExecutionsFetcher, {
    refreshInterval: isLive ? 7500 : 0,
    revalidateOnFocus: false
  });

  // Convert API data to expected format
  const services: AWSService[] = awsServicesData?.services ? 
    awsServicesData.services.map((service: any) => ({
      id: service.id,
      name: service.name,
      icon: service.icon,
      status: service.status as 'healthy' | 'degraded' | 'unhealthy',
      region: service.region || 'us-west-2',
      metrics: service.metrics || {},
      lastUpdated: new Date(service.lastUpdated || Date.now())
    })) : [];

  const logs: CloudWatchLog[] = logsData?.logs ? 
    logsData.logs.map((log: any) => ({
      id: log.id,
      timestamp: new Date(log.timestamp),
      level: log.level as 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
      service: log.service || 'unknown',
      message: log.message,
      requestId: log.requestId
    })) : [];

  const executions: StepFunctionExecution[] = executionsData && Array.isArray(executionsData) ?
    executionsData.map((exec: any) => ({
      id: exec.id,
      name: exec.name,
      status: exec.status as 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT',
      startTime: new Date(exec.startTime),
      endTime: exec.endTime ? new Date(exec.endTime) : undefined,
      duration: exec.duration,
      input: exec.input,
      output: exec.output
    })) : [];

  const isLoading = awsServicesLoading || logsLoading || executionsLoading;
  const error = awsServicesError || logsError || executionsError;

  const refreshData = useCallback(async () => {
    // Manually trigger revalidation of all SWR keys
    await Promise.all([
      mutate('aws-services'),
      mutate('cloudwatch-logs'),
      mutate('step-function-executions')
    ]);
  }, []);

  const getTotalCost = useCallback(() => {
    return services.reduce((total, service) => total + (service.metrics.cost || 0), 0);
  }, [services]);

  const getHealthyServicesCount = useCallback(() => {
    return services.filter(service => service.status === 'healthy').length;
  }, [services]);

  const getErrorRate = useCallback(() => {
    const totalInvocations = services.reduce((total, service) => 
      total + (service.metrics.invocations || 0), 0);
    const totalErrors = services.reduce((total, service) => 
      total + (service.metrics.errors || 0), 0);
    
    return totalInvocations > 0 ? (totalErrors / totalInvocations) * 100 : 0;
  }, [services]);

  const toggleLive = useCallback(() => {
    setIsLive(prev => !prev);
  }, []);

  return {
    services,
    logs,
    executions,
    isLoading,
    error: error?.message || null,
    refreshData,
    getTotalCost,
    getHealthyServicesCount,
    getErrorRate,
    isLive,
    toggleLive
  };
}; 