# Floro - Vegetation Stress Detection Dashboard

A real-time agricultural monitoring dashboard that uses **Sentinel-2 satellite imagery** to detect vegetation stress, analyze deforestation, and predict crop yields. Built with Next.js 15 and backed by an AWS serverless pipeline.

## Architecture

```
Frontend (Next.js, port 3000)
    |
    | HTTP REST API
    v
Backend (NestJS, port 3001)
    |
    | AWS SDK
    v
AWS Step Functions Pipeline
    |
    +-- Lambda: floro-search-images (Java 17)
    |     Queries Sentinel-2 STAC API for satellite images
    |
    +-- Lambda: floro-vegetation-analyzer (Python 3.9)  x N images (parallel)
    |     Downloads Red (B04) + NIR (B08) bands, calculates NDVI
    |
    +-- Lambda: floro-results-consolidator (Python 3.9)
    |     Aggregates NDVI results, detects deforestation
    |
    +-- Lambda: floro-visualization-generator (Python 3.9)
    |     Generates heatmap visualizations
    |
    +-- SNS: Sends email alert if vegetation stress detected
    |
    v
Results stored in S3 + DynamoDB
```

### How NDVI Works

**NDVI (Normalized Difference Vegetation Index)** measures vegetation health from satellite imagery:

```
NDVI = (NIR - Red) / (NIR + Red)
```

| NDVI Range | Meaning |
|------------|---------|
| -1.0 to 0.0 | Water, bare soil, clouds |
| 0.0 to 0.2 | Sparse vegetation, urban areas |
| 0.2 to 0.5 | Moderate vegetation |
| 0.5 to 1.0 | Dense, healthy vegetation |

A drop in NDVI over time indicates **vegetation stress or deforestation**.

## Dashboard Layout

The UI uses a resizable mosaic panel layout:

```
+---------------------+----------------------------+-------------------+
|                     |                            |                   |
|  Region Details     |     Monitoring Map         |  Analysis Tabs    |
|  (left sidebar)     |     (Leaflet)              |  - NDVI Analysis  |
|                     |                            |  - AWS Services   |
|  - Region info      |  - Region markers          |  - Yield Predict  |
|  - Edit/Delete      |  - Status indicators       |                   |
|  - Trigger analysis |  - Draw-to-create regions  |                   |
|                     |                            |                   |
+---------------------+----------------------------+-------------------+
|                    Operations Tabs                                    |
|  - Active Jobs  |  - Notification Settings  |  - System Logs        |
+----------------------------------------------------------------------+
```

All panels are **collapsible and resizable** via drag handles.

## Key Features

### Region Management
- Create monitored regions by drawing on the map
- Configure radius (1-50 km) and cloud cover threshold (0-100%)
- Start/pause automated monitoring per region
- Color-coded markers by status (green=active, blue=monitoring, orange=paused, red=alert)

### NDVI Satellite Analysis
- Select a region and date range, then trigger analysis
- Pipeline searches Sentinel-2 images, processes NDVI, and returns results
- Displays: NDVI statistics, vegetation health %, deforestation %, risk level
- Processed satellite images viewable in an image carousel

### Alert System
- Critical/High alerts trigger a full-screen overlay with sound notification
- Email subscriptions via SNS for automated alerts
- Alerts are acknowledged individually

### Yield Prediction
- Integrates satellite data (NDVI), weather (temperature, rainfall), and soil properties
- Predicts crop yield with confidence score and risk assessment

### AWS Services Monitor
- View Step Functions pipeline execution history
- Execution status, duration, and input/output inspection

## Tech Stack

| Library | Purpose |
|---------|---------|
| **Next.js 15** | React framework with server components |
| **React 19** | UI rendering |
| **React Leaflet** | Interactive map with markers, circles, heatmaps |
| **react-mosaic-component** | Resizable panel/window management |
| **SWR** | Data fetching with polling (5-30s intervals) |
| **Tailwind CSS** | Styling |
| **Blueprint.js** | UI component library |
| **Lucide React** | Icons |
| **Sharp** | Server-side TIFF to PNG conversion |
| **Radix UI** | Accessible primitive components |

## Project Structure

```
src/
  app/
    page.tsx                    # Entry point - loads MapWrapper
    layout.tsx                  # Root layout
    api/process-tiff/route.ts   # API route for TIFF conversion
  components/
    MosaicLayout.tsx            # Main dashboard layout manager
    MosaicMap.tsx               # Leaflet map with region markers
    MapToolbar.tsx              # Map controls (create, reset, satellite toggle)
    RegionDetailsPanel.tsx      # Selected region info and controls
    RegionForm.tsx              # Region creation form
    RegionsListPanel.tsx        # Searchable/filterable regions list
    NDVIImagePanel.tsx          # Satellite analysis trigger and results
    YieldPredictionPanel.tsx    # Crop yield prediction
    AlertsPanel.tsx             # Active alerts list
    CriticalAlertOverlay.tsx    # Full-screen critical alert with sound
    ActiveJobsPanel.tsx         # Running pipeline jobs
    SettingsPanel.tsx           # Email notification subscriptions
    AWSServicesPanel.tsx        # Step Functions execution monitor
    LogsPanel.tsx               # System logs viewer
    SystemHealthPanel.tsx       # Health metrics
    ui/                         # Reusable UI primitives (button, card, input, etc.)
  hooks/
    useAlertSubscriptions.ts    # Email subscription management
    useAWSServiceMonitoring.ts  # AWS services polling
    useYieldPrediction.ts       # Yield prediction API
    useYieldPredictionData.ts   # Real-time satellite/weather/soil data
  lib/
    api.ts                      # API client with all endpoints
    utils.ts                    # Utility functions
```

## Running Locally

### Prerequisites
- Node.js 18+
- Backend running on port 3001 (see `floro-infrastructure` repo)
- AWS resources deployed (Lambda, Step Functions, S3, DynamoDB, SNS)

### Start the frontend

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

## API Endpoints Consumed

| Endpoint | Purpose |
|----------|---------|
| `GET /dashboard/stats` | Dashboard statistics |
| `GET /dashboard/regions` | List monitored regions |
| `POST /dashboard/regions` | Create a region |
| `PUT /dashboard/regions/:id` | Update a region |
| `DELETE /dashboard/regions/:id` | Delete a region |
| `GET /dashboard/alerts` | Fetch alerts |
| `PUT /dashboard/alerts/:id/acknowledge` | Acknowledge alert |
| `POST /dashboard/alerts/subscribe` | Subscribe email |
| `GET /dashboard/jobs` | Active pipeline jobs |
| `POST /sentinel/analyze-region` | Trigger NDVI analysis |
| `POST /sentinel/search` | Search Sentinel-2 images |
| `GET /sentinel/status/:jobId` | Pipeline job status |
| `POST /sentinel/step-functions/trigger` | Trigger Step Functions pipeline |
| `GET /dashboard/aws/step-function-executions` | Pipeline execution history |
| `POST /yield/predict` | Crop yield prediction |

## Deployment

Frontend is deployed on **Vercel**:

- Framework: Next.js (auto-detected)
- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build` (default)
- Environment variable: `NEXT_PUBLIC_API_URL` pointed to deployed backend URL
