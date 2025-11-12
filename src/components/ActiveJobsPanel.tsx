"use client";

import useSWR, { mutate } from 'swr';
import { api, ActiveJob } from '../lib/api';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { AlertCircle, CheckCircle2, Loader2, ServerCog, RefreshCw } from 'lucide-react';
import { Progress } from './ui/progress';

const fetcher = () => api.getActiveJobs();

export default function ActiveJobsPanel() {
  const { data: jobs, error, isLoading } = useSWR('activeJobs', fetcher, {
    refreshInterval: 5000 // Poll every 5 seconds
  });

  const handleRefresh = async () => {
    await mutate('activeJobs');
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-600">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p className="text-lg font-semibold">Failed to load jobs</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Active Jobs</h3>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
            title="Refresh jobs"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        
        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <CheckCircle2 className="w-12 h-12 mb-4 text-green-500" />
          <p className="text-lg font-semibold">No Active Jobs</p>
          <p className="text-sm">The analysis cluster is currently idle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Active Jobs</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
          title="Refresh jobs"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-2 space-y-2">
        {jobs.map((job) => (
          <Card key={job.jobId} className="rounded-none shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {job.status === 'IN_PROGRESS' && <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />}
                  {job.status === 'PENDING' && <ServerCog className="h-6 w-6 text-yellow-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800 truncate" title={job.regionName}>
                    {job.regionName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Status: {job.status.replace('_', ' ')}
                  </p>
                  <Progress value={job.progress} className="mt-2 h-2 rounded-none" />
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {job.progress}%
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 