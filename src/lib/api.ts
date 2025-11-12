// Production API endpoint (AWS App Runner)
// const API_BASE_URL = "https://mjyrhckyxt.ap-south-1.awsapprunner.com";
// Local development (uncomment for local testing)
const API_BASE_URL = 'http://localhost:3001';

export interface Region {
	id: string;
	name: string;
	latitude: number;
	longitude: number;
	description: string;
	radiusKm: number;
	cloudCoverThreshold: number;
	status: "ACTIVE" | "PAUSED" | "MONITORING";
	createdAt: string;
	lastDeforestationPercentage?: number;
	lastAnalysis?: string;
}

export interface CreateRegionDto {
	name: string;
	latitude: number;
	longitude: number;
	description: string;
	radiusKm: number;
	cloudCoverThreshold: number;
}

export interface DashboardStats {
	totalRegions: number;
	activeAlerts: number;
	avgDeforestation: number;
	imagesProcessed: number;
	activeJobs: number;
	lastUpdate: string;
}

export interface Alert {
	id: string;
	regionId: string;
	regionName: string;
	level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
	deforestationPercentage: number | string;
	message: string;
	timestamp: string;
	acknowledged: boolean;
}

export interface HeatmapDataPoint {
	lat: number;
	lng: number;
	intensity: number;
}

export interface HeatmapResponse {
	bounds: {
		north: number;
		south: number;
		east: number;
		west: number;
	};
	data: HeatmapDataPoint[];
	generatedAt: string;
	periodDays: number;
}

export interface ActiveJob {
	jobId: string;
	regionId: string;
	regionName: string;
	status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
	progress: number;
	startTime: string;
	totalImages: number;
	processedImages: number;
}

export interface AlertSubscription {
	email: string;
	subscriptionArn: string;
	status: "PendingConfirmation" | "Confirmed" | "Deleted";
}

export interface AlertSubscriptionsResponse {
	subscriptions: AlertSubscription[];
}

export interface SubscribeResponse {
	message: string;
	subscriptionArn: string;
}

// New interfaces for region analysis control
export interface StartAnalysisDto {
	cronExpression?: string;
	triggerImmediate?: boolean;
}

export interface RegionAnalysisControlDto {
	regionId: string;
	status: "ACTIVE" | "PAUSED" | "MONITORING";
	cronExpression: string | null;
	updatedAt: string;
	message: string;
}

export interface AnalysisScheduleDto {
	regionId: string;
	regionName: string;
	status: "ACTIVE" | "PAUSED" | "MONITORING";
	cronExpression: string | null;
	nextAnalysis: string | null;
	lastAnalysis: string | null;
	analysesLast24h: number;
	isActive: boolean;
}

// API Client functions

// Helper to map API's `regionId` to frontend's `id`
function mapRegionResponse(region: any): Region {
	const { regionId, ...rest } = region;
	return {
		...rest,
		id: regionId,
	};
}

export const api = {
	// Dashboard endpoints
	async getDashboardStats(): Promise<DashboardStats> {
		const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
		if (!response.ok) throw new Error("Failed to fetch dashboard stats");
		return response.json();
	},

	async getRegions(status?: string): Promise<Region[]> {
		const url = new URL(`${API_BASE_URL}/dashboard/regions`);
		if (status) url.searchParams.append("status", status);

		const response = await fetch(url.toString());
		if (!response.ok) throw new Error("Failed to fetch regions");

		const data = await response.json();
		// The API is returning regionId, but the frontend interface expects id.
		// We map it here to ensure consistency across the app.
		if (Array.isArray(data)) {
			return data.map(mapRegionResponse);
		}
		return [];
	},

	async createRegion(regionData: CreateRegionDto): Promise<Region> {
		const response = await fetch(`${API_BASE_URL}/dashboard/regions`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(regionData),
		});
		if (!response.ok) throw new Error("Failed to create region");
		const region = await response.json();
		return mapRegionResponse(region);
	},

	async getRegion(regionId: string): Promise<Region> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/regions/${regionId}`
		);
		if (!response.ok) throw new Error("Failed to fetch region");
		const region = await response.json();
		return mapRegionResponse(region);
	},

	async updateRegion(
		regionId: string,
		regionData: Partial<CreateRegionDto>
	): Promise<Region> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/regions/${regionId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(regionData),
			}
		);
		if (!response.ok) throw new Error("Failed to update region");
		const region = await response.json();
		return mapRegionResponse(region);
	},

	async deleteRegion(regionId: string): Promise<void> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/regions/${regionId}`,
			{
				method: "DELETE",
			}
		);
		if (!response.ok) throw new Error("Failed to delete region");
	},

	async getAlerts(
		level?: string,
		acknowledged?: boolean,
		limit?: number
	): Promise<Alert[]> {
		const url = new URL(`${API_BASE_URL}/dashboard/alerts`);
		if (level) url.searchParams.append("level", level);
		if (acknowledged !== undefined)
			url.searchParams.append("acknowledged", acknowledged.toString());
		if (limit) url.searchParams.append("limit", limit.toString());

		const response = await fetch(url.toString());
		if (!response.ok) throw new Error("Failed to fetch alerts");
		const data = await response.json();

		// Map API response fields to interface fields
		if (Array.isArray(data)) {
			return data.map((alert: any) => ({
				...alert,
				id: alert.alertId, // Map alertId to id for consistency
			}));
		}
		return [];
	},

	async acknowledgeAlert(alertId: string): Promise<void> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/alerts/${alertId}/acknowledge`,
			{
				method: "PUT",
			}
		);
		if (!response.ok) throw new Error("Failed to acknowledge alert");
	},

	// async getHeatmapData(bounds: { north: number, south: number, east: number, west: number }, days?: number): Promise<HeatmapResponse> {
	//   const url = new URL(`${API_BASE_URL}/dashboard/heatmap`);
	//   url.searchParams.append('north', bounds.north.toString());
	//   url.searchParams.append('south', bounds.south.toString());
	//   url.searchParams.append('east', bounds.east.toString());
	//   url.searchParams.append('west', bounds.west.toString());
	//   if (days) url.searchParams.append('days', days.toString());

	//   const response = await fetch(url.toString());
	//   if (!response.ok) throw new Error('Failed to fetch heatmap data');
	//   return response.json();
	// },

	async getActiveJobs(
		status?: "PENDING" | "IN_PROGRESS"
	): Promise<ActiveJob[]> {
		const url = new URL(`${API_BASE_URL}/dashboard/jobs`);
		if (status) url.searchParams.append("status", status);

		const response = await fetch(url.toString());
		if (!response.ok) throw new Error("Failed to fetch active jobs");
		return response.json();
	},

	async triggerAnalysis(
		latitude: number,
		longitude: number,
		startDate: string,
		endDate: string,
		cloudCover: number
	): Promise<{ message: string; executionArn: string }> {
		const response = await fetch(
			`${API_BASE_URL}/sentinel/step-functions/trigger`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					searchParams: {
						latitude,
						longitude,
						startDate,
						endDate,
						cloudCover,
					},
					maxImages: 20,
				}),
			}
		);
		if (!response.ok) throw new Error("Failed to trigger analysis");
		return response.json();
	},

	// Alert subscription endpoints
	async getAlertSubscriptions(): Promise<AlertSubscriptionsResponse> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/alerts/subscriptions`
		);
		if (!response.ok) throw new Error("Failed to fetch alert subscriptions");
		return response.json();
	},

	async subscribeToAlerts(email: string): Promise<SubscribeResponse> {
		const response = await fetch(`${API_BASE_URL}/dashboard/alerts/subscribe`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		if (!response.ok) throw new Error("Failed to subscribe to alerts");
		return response.json();
	},

	async unsubscribeFromAlerts(email: string): Promise<void> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/alerts/unsubscribe?email=${encodeURIComponent(
				email
			)}`,
			{
				method: "DELETE",
			}
		);
		if (!response.ok) throw new Error("Failed to unsubscribe from alerts");
	},

	// AWS Services & Monitoring endpoints
	// async getAWSServiceMetrics(): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/aws/services`);
	//   if (!response.ok) throw new Error('Failed to fetch AWS service metrics');
	//   return response.json();
	// },

	// async getAWSCostData(): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/aws/costs`);
	//   if (!response.ok) throw new Error('Failed to fetch AWS cost data');
	//   return response.json();
	// },

	// async getCloudWatchLogs(logGroup?: string, limit?: number): Promise<any> {
	//   const params = new URLSearchParams();
	//   if (logGroup) params.append('logGroup', logGroup);
	//   if (limit) params.append('limit', limit.toString());

	//   const controller = new AbortController();
	//   const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

	//   try {
	//     const response = await fetch(`${API_BASE_URL}/dashboard/aws/logs?${params}`, {
	//       signal: controller.signal,
	//     });
	//     if (!response.ok) throw new Error('Failed to fetch CloudWatch logs');
	//     return response.json();
	//   } catch (error: any) {
	//     if (error.name === 'AbortError') {
	//       throw new Error('Request timed out after 30 seconds');
	//     }
	//     throw error;
	//   } finally {
	//     clearTimeout(timeoutId);
	//   }
	// },

	async getStepFunctionExecutions(limit?: number): Promise<any> {
		const params = new URLSearchParams();
		if (limit) params.append("limit", limit.toString());

		const response = await fetch(
			`${API_BASE_URL}/dashboard/aws/step-function-executions?${params}`
		);
		if (!response.ok)
			throw new Error("Failed to fetch Step Function executions");
		return response.json();
	},

	// async getSystemHealth(): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/integration/system-health`);
	//   if (!response.ok) throw new Error('Failed to fetch system health');
	//   return response.json();
	// },

	// async getActivityFeed(limit?: number): Promise<any> {
	//   const params = new URLSearchParams();
	//   if (limit) params.append('limit', limit.toString());

	//   const response = await fetch(`${API_BASE_URL}/dashboard/activity?${params}`);
	//   if (!response.ok) throw new Error('Failed to fetch activity feed');
	//   return response.json();
	// },

	// NDVI Analysis endpoints
	async searchSentinelImages(params: {
		latitude: number;
		longitude: number;
		startDate: string;
		endDate: string;
		cloudCover: number;
	}): Promise<any> {
		const response = await fetch(`${API_BASE_URL}/sentinel/search`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});
		if (!response.ok) throw new Error("Failed to search Sentinel images");
		return response.json();
	},

	async analyzeRegionForDeforestation(params: {
		latitude: number;
		longitude: number;
		startDate: string;
		endDate: string;
		cloudCover: number;
	}): Promise<any> {
		const response = await fetch(`${API_BASE_URL}/sentinel/analyze-region`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});
		if (!response.ok) throw new Error("Failed to analyze region");
		return response.json();
	},

	async getJobStatus(jobId: string): Promise<any> {
		const response = await fetch(`${API_BASE_URL}/sentinel/status/${jobId}`);
		if (!response.ok) throw new Error("Failed to get job status");
		return response.json();
	},

	// K-means clustering endpoints (using performance analytics)
	// async getPerformanceOverview(): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/performance/overview`);
	//   if (!response.ok) throw new Error('Failed to fetch performance overview');
	//   return response.json();
	// },

	// async getPerformanceTrends(days: number = 30): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/performance/trends?days=${days}`);
	//   if (!response.ok) throw new Error('Failed to fetch performance trends');
	//   return response.json();
	// },

	// async getRegionPerformance(regionId: string, limit: number = 50): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/performance/regions/${regionId}?limit=${limit}`);
	//   if (!response.ok) throw new Error('Failed to fetch region performance data');
	//   return response.json();
	// },

	// TIFF Image Processing endpoint (local Next.js API route)
	async processTiffImage(
		tiffUrl: string,
		options?: {
			width?: number;
			height?: number;
			format?: "jpeg" | "png" | "webp";
			quality?: number;
		}
	): Promise<string> {
		const params = new URLSearchParams();
		params.append("url", tiffUrl);
		if (options?.width) params.append("width", options.width.toString());
		if (options?.height) params.append("height", options.height.toString());
		if (options?.format) params.append("format", options.format);
		if (options?.quality) params.append("quality", options.quality.toString());

		const response = await fetch(`/api/process-tiff?${params}`);
		if (!response.ok) throw new Error("Failed to process TIFF image");

		// Return the processed image URL or data URL
		const result = await response.json();
		return result.imageUrl || result.dataUrl;
	},

	// Progressive TIFF loading with chunks
	async getTiffImageChunks(
		tiffUrl: string,
		chunkSize: number = 1024 * 1024
	): Promise<{
		totalSize: number;
		chunks: number;
		baseUrl: string;
	}> {
		const response = await fetch(
			`${API_BASE_URL}/api/tiff-info?url=${encodeURIComponent(tiffUrl)}`
		);
		if (!response.ok) throw new Error("Failed to get TIFF info");
		return response.json();
	},

	// Visualization endpoints
	// async getRegionVisualizations(regionId: string): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/regions/${regionId}/visualizations`);
	//   if (!response.ok) throw new Error('Failed to fetch region visualizations');
	//   return response.json();
	// },

	// async getVisualizationImage(tileId: string, timestamp: string, chartType: string): Promise<any> {
	//   const response = await fetch(`${API_BASE_URL}/dashboard/visualizations/${tileId}/${timestamp}/${chartType}`);
	//   if (!response.ok) throw new Error('Failed to fetch visualization image');
	//   return response.json();
	// },

	// Region Analysis Control endpoints
	async startRegionAnalysis(
		regionId: string,
		options?: StartAnalysisDto
	): Promise<RegionAnalysisControlDto> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/regions/${regionId}/start-analysis`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(options || {}),
			}
		);
		if (!response.ok) throw new Error("Failed to start region analysis");
		return response.json();
	},

	async pauseRegionAnalysis(
		regionId: string
	): Promise<RegionAnalysisControlDto> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/regions/${regionId}/pause-analysis`,
			{
				method: "POST",
			}
		);
		if (!response.ok) throw new Error("Failed to pause region analysis");
		return response.json();
	},

	async getAnalysisSchedule(regionId: string): Promise<AnalysisScheduleDto> {
		const response = await fetch(
			`${API_BASE_URL}/dashboard/regions/${regionId}/analysis-schedule`
		);
		if (!response.ok) throw new Error("Failed to fetch analysis schedule");
		return response.json();
	},
};
