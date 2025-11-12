"use client";

import { useState, useEffect, useRef, useContext } from "react";
import {
	Mosaic,
	MosaicWindow,
	MosaicContext,
	MosaicNode,
} from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import {
	X,
	Settings,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Monitor,
	BarChart3,
	Cog,
	Eye,
	EyeOff,
	Maximize2,
	Minimize2,
	Github,
	Minus,
} from "lucide-react";
import { Region, api } from "../lib/api";
import MosaicMap, { LeafletMap } from "./MosaicMap";
import RegionDetailsPanel from "./RegionDetailsPanel";
import MapToolbar from "./MapToolbar";
import AlertsPanel from "./AlertsPanel";
import ActiveJobsPanel from "./ActiveJobsPanel";
import SettingsPanel from "./SettingsPanel";
// import ActivityFeed from './ActivityFeed';
import SystemHealthPanel from "./SystemHealthPanel";
import LogsPanel from "./LogsPanel";
import AWSServicesPanel from "./AWSServicesPanel";
// import KMeansClusteringPanel from './KMeansClusteringPanel';
import NDVIImagePanel from "./NDVIImagePanel";
import RegionsListPanel from "./RegionsListPanel";
import CriticalAlertOverlay from "./CriticalAlertOverlay";
import { ToastContainer, useToast } from "./ui/toast";

// type ViewId = 'map' | 'details' | 'alerts' | 'jobs' | 'settings' | 'activity' | 'health' | 'logs' | 'aws' | 'kmeans' | 'ndvi' | 'regions';
type ViewId =
	| "map"
	| "details"
	// | "alerts"
	| "jobs"
	| "settings"
	// | "health"
	| "logs"
	| "aws"
	| "ndvi"
	| "regions";

const TITLE_MAP: Record<ViewId, string> = {
	map: "FLORO MONITORING MAP",
	details: "REGION DETAILS",
	// alerts: 'ACTIVE ALERTS',
	jobs: "ACTIVE ANALYSIS JOBS",
	settings: "NOTIFICATION SETTINGS",
	// activity: 'ACTIVITY FEED',
	// health: 'SYSTEM HEALTH',
	logs: "SYSTEM LOGS",
	aws: "AWS SERVICES MONITOR",
	// kmeans: 'K-MEANS CLUSTERING',
	ndvi: "NDVI IMAGE ANALYSIS",
	regions: "REGIONS LIST",
};

const ICON_MAP: Record<ViewId, string> = {
	map: "MAP",
	details: "DTL",
	// alerts: 'ALT',
	jobs: "JOB",
	settings: "SET",
	// activity: 'ACT',
	// health: 'HLT',
	logs: "LOG",
	aws: "AWS",
	// kmeans: 'KMN',
	ndvi: "NDV",
	regions: "RGN",
};

// Tab groups for organized layout
const TAB_GROUPS = {
	// monitoring: {
	//   title: 'Monitoring',
	//   icon: Monitor,
	//   // views: ['activity', 'health', 'alerts', 'regions'] as ViewId[],
	//   views: ['health', 'alerts', 'regions'] as ViewId[],
	// },
	analysis: {
		title: "Analysis",
		icon: BarChart3,
		// views: ['kmeans', 'ndvi', 'aws'] as ViewId[],
		views: ["ndvi", "aws"] as ViewId[],
	},
	operations: {
		title: "Operations",
		icon: Cog,
		views: ["jobs", "settings", "logs"] as ViewId[],
	},
};

export default function MosaicLayout() {
	const { toasts, dismissToast, showSuccess, showError, showInfo } = useToast();
	const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [regions, setRegions] = useState<Region[]>([]);
	const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isSatelliteView, setIsSatelliteView] = useState(false);
	const [ndviAreaSelectionMode, setNdviAreaSelectionMode] = useState(false);
	const mapRef = useRef<LeafletMap>(null);

	// Sidebar and tab states
	const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
	const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
	const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
	// const [leftSidebarTab, setLeftSidebarTab] = useState<keyof typeof TAB_GROUPS>('monitoring');
	const [rightSidebarTab, setRightSidebarTab] =
		useState<keyof typeof TAB_GROUPS>("analysis");
	const [bottomPanelTab, setBottomPanelTab] =
		useState<keyof typeof TAB_GROUPS>("operations");
	// const [activeView, setActiveView] = useState<ViewId>('activity');
	// const [activeView, setActiveView] = useState<ViewId>("health");
	const [activeAnalysisView, setActiveAnalysisView] = useState<ViewId>("ndvi");
	const [activeOperationsView, setActiveOperationsView] =
		useState<ViewId>("jobs");

	// Panel size states for resizing
	const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
	const [rightSidebarWidth, setRightSidebarWidth] = useState(800);
	const [bottomPanelHeight, setBottomPanelHeight] = useState(280);
	const [isResizing, setIsResizing] = useState<
		"left" | "right" | "bottom" | null
	>(null);

	// Simplified mosaic layout for main content area
	const [currentValue, setCurrentValue] = useState<MosaicNode<ViewId> | null>({
		direction: "row",
		first: "details",
		second: "map",
		splitPercentage: 30,
	});

	const [isWindowMenuOpen, setIsWindowMenuOpen] = useState(false);

	// Panel collapse/close states
	const [collapsedPanels, setCollapsedPanels] = useState<Set<ViewId>>(
		new Set()
	);
	const [closedPanels, setClosedPanels] = useState<Set<ViewId>>(new Set());

	// Load regions on initial mount
	useEffect(() => {
		const loadRegions = async () => {
			try {
				const data = await api.getRegions();
				setRegions(data);
			} catch (err) {
				console.error("Failed to load regions:", err);
				handleError(
					"Failed to load initial region data. Please refresh the page."
				);
			}
		};
		loadRegions();
	}, []);

	// Clear error after 5 seconds
	useEffect(() => {
		if (error) {
			const timer = setTimeout(() => setError(null), 5000);
			return () => clearTimeout(timer);
		}
	}, [error]);

	// Resize handling
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isResizing) return;

			if (isResizing === "left") {
				const newWidth = Math.max(200, Math.min(600, e.clientX));
				setLeftSidebarWidth(newWidth);
			} else if (isResizing === "right") {
				const newWidth = Math.max(
					200,
					Math.min(800, window.innerWidth - e.clientX)
				);
				setRightSidebarWidth(newWidth);
			} else if (isResizing === "bottom") {
				const newHeight = Math.max(
					150,
					Math.min(500, window.innerHeight - e.clientY - 50)
				);
				setBottomPanelHeight(newHeight);
			}
		};

		const handleMouseUp = () => {
			setIsResizing(null);
			document.body.style.cursor = "default";
			document.body.style.userSelect = "auto";
		};

		if (isResizing) {
			document.body.style.cursor =
				isResizing === "bottom" ? "ns-resize" : "ew-resize";
			document.body.style.userSelect = "none";
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing]);

	const handleToggleHeatmap = () => {
		setIsHeatmapVisible((prev) => !prev);
	};

	const handleToggleSatellite = () => {
		setIsSatelliteView((prev) => !prev);
	};

	const handleToggleCreate = () => {
		setIsCreating((prev) => !prev);
	};

	const handleRegionSelected = (region: Region) => {
		setSelectedRegion(region);
		if (ndviAreaSelectionMode) {
			setNdviAreaSelectionMode(false);
		}
	};

	const handleRegionDeselected = () => {
		setSelectedRegion(null);
	};

	const handleNdviAreaSelectionRequest = () => {
		setNdviAreaSelectionMode(true);
	};

	const handleRegionUpdated = (updatedRegion: Region) => {
		setSelectedRegion(updatedRegion);
		setRegions((prev) =>
			prev.map((r) => (r.id === updatedRegion.id ? updatedRegion : r))
		);
	};

	const handleRegionCreated = (newRegion: Region) => {
		setRegions((prev) => [...prev, newRegion]);
		setSelectedRegion(newRegion);
	};

	const handleRegionDeleted = (regionId: string) => {
		setSelectedRegion(null);
		setRegions((prev) => prev.filter((r) => r.id !== regionId));
	};

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
	};

	// Panel collapse/close handlers
	const handleToggleCollapse = (viewId: ViewId) => {
		setCollapsedPanels((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(viewId)) {
				newSet.delete(viewId);
			} else {
				newSet.add(viewId);
			}
			return newSet;
		});
	};

	const handleClosePanel = (viewId: ViewId) => {
		setClosedPanels((prev) => new Set([...prev, viewId]));

		// If closing the region details panel, also deselect the region
		if (viewId === "details") {
			setSelectedRegion(null);
		}

		// Update mosaic layout to remove the closed panel
		if (
			currentValue &&
			typeof currentValue === "object" &&
			"first" in currentValue
		) {
			if (currentValue.first === viewId) {
				setCurrentValue(currentValue.second);
			} else if (currentValue.second === viewId) {
				setCurrentValue(currentValue.first);
			}
		} else if (currentValue === viewId) {
			// If the closed panel was the only one, switch to map
			setCurrentValue("map");
		}

		// Handle sidebar panel closures - switch to another available panel
		// if (TAB_GROUPS.monitoring.views.includes(viewId) && activeView === viewId) {
		//   const availableViews = TAB_GROUPS.monitoring.views.filter(v => v !== viewId && !closedPanels.has(v));
		//   if (availableViews.length > 0) {
		//     setActiveView(availableViews[0]);
		//   }
		// }

		if (
			TAB_GROUPS.analysis.views.includes(viewId) &&
			activeAnalysisView === viewId
		) {
			const availableViews = TAB_GROUPS.analysis.views.filter(
				(v) => v !== viewId && !closedPanels.has(v)
			);
			if (availableViews.length > 0) {
				setActiveAnalysisView(availableViews[0]);
			}
		}

		if (
			TAB_GROUPS.operations.views.includes(viewId) &&
			activeOperationsView === viewId
		) {
			const availableViews = TAB_GROUPS.operations.views.filter(
				(v) => v !== viewId && !closedPanels.has(v)
			);
			if (availableViews.length > 0) {
				setActiveOperationsView(availableViews[0]);
			}
		}
	};

	const handleReopenPanel = (viewId: ViewId) => {
		setClosedPanels((prev) => {
			const newSet = new Set(prev);
			newSet.delete(viewId);
			return newSet;
		});

		// Set as active view in appropriate sidebar
		// if (TAB_GROUPS.monitoring.views.includes(viewId)) {
		// setActiveView(viewId);
		// setLeftSidebarOpen(true);
		// } else
		if (TAB_GROUPS.analysis.views.includes(viewId)) {
			setActiveAnalysisView(viewId);
			setRightSidebarOpen(true);
		} else if (TAB_GROUPS.operations.views.includes(viewId)) {
			setActiveOperationsView(viewId);
			setBottomPanelOpen(true);
		} else {
			// For main content panels (map, details), re-add to mosaic layout
			if (!currentValue) {
				setCurrentValue(viewId);
			} else if (typeof currentValue === "string") {
				setCurrentValue({
					direction: "row",
					first: currentValue,
					second: viewId,
					splitPercentage: 50,
				});
			}
		}
	};

	// Component renderers
	const renderComponent = (viewId: ViewId) => {
		switch (viewId) {
			case "map":
				return (
					<div className="relative h-full">
						{ndviAreaSelectionMode && (
							<div className="absolute top-0 left-0 right-0 z-[1000] bg-blue-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span>🗺️</span>
									<span>Click on a region to select it for NDVI analysis</span>
								</div>
								<button
									onClick={() => setNdviAreaSelectionMode(false)}
									className="text-white hover:text-blue-200 text-lg"
								>
									×
								</button>
							</div>
						)}
						<MosaicMap
							ref={mapRef}
							onRegionSelected={handleRegionSelected}
							onRegionDeselected={handleRegionDeselected}
							onError={handleError}
							isHeatmapVisible={isHeatmapVisible}
							isSatelliteView={isSatelliteView}
							isCreating={isCreating}
							setIsCreating={setIsCreating}
							onRegionCreated={handleRegionCreated}
							regions={regions}
							selectedRegion={selectedRegion}
							ndviSelectionMode={ndviAreaSelectionMode}
						/>
					</div>
				);
			case "details":
				return (
					<RegionDetailsPanel
						region={selectedRegion}
						onRegionUpdated={handleRegionUpdated}
						onRegionDeleted={handleRegionDeleted}
						onRegionDeselected={handleRegionDeselected}
						onError={handleError}
						onShowToast={{ showSuccess, showError, showInfo }}
					/>
				);
			// case 'alerts':
			//   return <AlertsPanel />;
			case "jobs":
				return <ActiveJobsPanel />;
			case "settings":
				return <SettingsPanel onError={handleError} />;
			// case 'activity':
			//   return <ActivityFeed />;
			// case 'health':
			//   return <SystemHealthPanel />;
			case "logs":
				return <LogsPanel />;
			case "aws":
				return <AWSServicesPanel />;
			// case 'kmeans':
			//   return <KMeansClusteringPanel selectedRegion={selectedRegion} />;
			case "ndvi":
				return (
					<NDVIImagePanel
						selectedRegion={selectedRegion}
						onRequestAreaSelection={handleNdviAreaSelectionRequest}
					/>
				);
			case "regions":
				return (
					<RegionsListPanel
						selectedRegion={selectedRegion}
						onRegionSelected={handleRegionSelected}
					/>
				);
			default:
				return <div>Unknown view</div>;
		}
	};

	const renderTile = (id: ViewId, path: any) => {
		const isCollapsed = collapsedPanels.has(id);

		const customControls = (
			<div className="flex items-center gap-2">
				{id === "map" && (
					<MapToolbar
						onToggleHeatmap={handleToggleHeatmap}
						isHeatmapVisible={isHeatmapVisible}
						onToggleCreate={handleToggleCreate}
						isCreating={isCreating}
						isSatelliteView={isSatelliteView}
						onToggleSatellite={handleToggleSatellite}
						onZoomIn={() => mapRef.current?.zoomIn()}
						onZoomOut={() => mapRef.current?.zoomOut()}
						onResetView={() => mapRef.current?.setView([19.7515, 75.7139], 7)}
						regionCount={regions.length}
					/>
				)}

				{/* Panel Controls */}
				<div className="flex items-center gap-1 ml-2">
					<button
						onClick={() => handleToggleCollapse(id)}
						className="p-1 text-white panel-control-btn"
						title={isCollapsed ? "Expand panel" : "Collapse panel"}
					>
						<Minus size={12} />
					</button>
					<button
						onClick={() => handleClosePanel(id)}
						className="p-1 text-white panel-control-btn"
						title="Close panel"
					>
						<X size={12} />
					</button>
				</div>
			</div>
		);

		return (
			<MosaicWindow
				path={path}
				title={TITLE_MAP[id]}
				toolbarControls={customControls}
				createNode={() => id}
			>
				<div
					className={`h-full panel-content ${
						isCollapsed ? "collapsed" : "expanded"
					}`}
					onDoubleClick={() => handleToggleCollapse(id)}
				>
					{!isCollapsed && renderComponent(id)}
				</div>
			</MosaicWindow>
		);
	};

	const renderSidebarTabs = (
		groupKeys: (keyof typeof TAB_GROUPS)[],
		activeTab: keyof typeof TAB_GROUPS,
		onTabChange: (tab: keyof typeof TAB_GROUPS) => void
	) => (
		<div className="flex border-b border-[#d5dbdb] bg-[#f2f3f3]">
			{groupKeys.map((key) => {
				const IconComponent = TAB_GROUPS[key].icon;
				return (
					<button
						key={key}
						onClick={() => onTabChange(key)}
						className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-2 ${
							activeTab === key
								? "border-[#0972d3] text-[#0972d3] bg-white"
								: "border-transparent text-[#687078] hover:text-[#0f1419] hover:bg-[#e9ecef]"
						}`}
					>
						<IconComponent size={14} />
						{TAB_GROUPS[key].title}
					</button>
				);
			})}
		</div>
	);

	const renderSidebarContent = (
		activeTab: keyof typeof TAB_GROUPS,
		activeView: ViewId,
		onViewChange: (view: ViewId) => void
	) => {
		const views = TAB_GROUPS[activeTab].views;
		const availableViews = views.filter((view) => !closedPanels.has(view));
		const isCollapsed = collapsedPanels.has(activeView);

		// If no views are available, show empty state
		if (availableViews.length === 0) {
			return (
				<div className="h-full flex flex-col items-center justify-center text-center p-4">
					<div className="text-[#687078] text-sm">
						<p className="font-medium mb-2">
							All {TAB_GROUPS[activeTab].title} panels are closed
						</p>
						<p className="text-xs">Reopen panels from the header bar</p>
					</div>
				</div>
			);
		}

		return (
			<div className="h-full flex flex-col">
				<div className="flex bg-[#f8f9fa] border-b border-[#d5dbdb]">
					{availableViews.map((view) => (
						<button
							key={view}
							onClick={() => onViewChange(view)}
							className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
								activeView === view
									? "bg-white text-[#0972d3] border-b-2 border-[#0972d3]"
									: "text-[#687078] hover:text-[#0f1419] hover:bg-[#e9ecef]"
							}`}
						>
							{ICON_MAP[view]}
						</button>
					))}
				</div>

				{/* Panel Header with Controls */}
				<div
					className={`flex items-center justify-between bg-[#232f3e] text-white px-3 py-2 text-xs font-semibold ${
						isCollapsed ? "collapsed-indicator" : ""
					}`}
				>
					<div
						className="flex-1 cursor-pointer"
						onDoubleClick={() => handleToggleCollapse(activeView)}
						title="Double-click to collapse/expand"
					>
						{TITLE_MAP[activeView]}
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={() => handleToggleCollapse(activeView)}
							className="p-1 text-white panel-control-btn"
							title={isCollapsed ? "Expand panel" : "Collapse panel"}
						>
							<Minus size={10} />
						</button>
						<button
							onClick={() => handleClosePanel(activeView)}
							className="p-1 text-white panel-control-btn"
							title="Close panel"
						>
							<X size={10} />
						</button>
					</div>
				</div>

				<div
					className={`flex-1 overflow-y-auto panel-content ${
						isCollapsed ? "collapsed" : "expanded"
					}`}
				>
					{!isCollapsed && renderComponent(activeView)}
				</div>
			</div>
		);
	};

	return (
		<div className="relative h-screen grid grid-cols-1 grid-rows-[50px_1fr]">
			{/* Top Navigation Bar */}
			<div className="bg-white text-[#0f1419] px-4 py-2 flex items-center justify-between border-b border-[#d5dbdb] col-span-1 row-span-1">
				<div className="flex items-center gap-2">
					<img src="/logo.png" alt="Floro Logo" className="w-14 h-14" />
					<h1 className="text-base font-semibold">Floro Dashboard</h1>

					<span className="px-3 py-1.5 text-xs font-medium text-[#687078] border-l border-[#d5dbdb] ml-3 pl-3">
						Region: Ap-South-1
					</span>
				</div>

				{/* Center Section - GitHub Links & Closed Panels */}
				<div className="flex items-center gap-4">
					{/* Closed Panels Indicator */}
					{closedPanels.size > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-xs text-[#687078] font-medium">
								Closed:
							</span>
							{Array.from(closedPanels).map((panelId) => (
								<button
									key={panelId}
									onClick={() => handleReopenPanel(panelId)}
									className="px-2 py-1 text-xs font-medium bg-[#f8f9fa] text-[#687078] hover:text-[#0972d3] hover:bg-[#e9ecef] rounded border border-[#d5dbdb] hover:border-[#0972d3] reopen-btn"
									title={`Reopen ${TITLE_MAP[panelId]}`}
								>
									{ICON_MAP[panelId]}
								</button>
							))}
						</div>
					)}

					{/* GitHub Links */}
					<div className="flex items-center gap-2">
						<a
							href="https://github.com/Vinay-Basargekar/floro-infrastructure"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#687078] hover:text-[#0972d3] hover:bg-[#f8f9fa] rounded transition-colors border border-[#d5dbdb] hover:border-[#0972d3]"
							title="Infrastructure Repository (AWS Lambda & Services)"
						>
							<Github size={18} />
							<span>Infrastructure</span>
						</a>
						<a
							href="https://github.com/Vinay-Basargekar/floro-Frontend"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#687078] hover:text-[#0972d3] hover:bg-[#f8f9fa] rounded transition-colors border border-[#d5dbdb] hover:border-[#0972d3]"
							title="Frontend Repository (AWS Amplify)"
						>
							<img
								src="/aws-icons/amplify.png"
								alt="AWS Amplify"
								className="w-6 h-6"
							/>
							<span>Frontend</span>
						</a>
					</div>
				</div>

				{/* Enhanced Layout Controls */}
				<div className="flex items-center gap-1">
					{/* <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className={`group relative px-4 py-2 text-xs font-medium transition-all duration-200 border border-[#d5dbdb] hover:border-[#0972d3] ${leftSidebarOpen
                ? 'bg-[#0972d3] border-[#0558a5] text-white shadow-lg'
                : 'bg-[#f8f9fa] text-[#687078] hover:bg-[#e9ecef] hover:text-[#0f1419]'
              }`}
            style={{ borderRadius: '4px 0 0 4px' }}
            title={leftSidebarOpen ? "Hide Monitoring Panel" : "Show Monitoring Panel"}
          >
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              <span>Monitor</span>
              {leftSidebarOpen ? <EyeOff size={12} /> : <Eye size={12} />}
            </div>
            <div className={`absolute -bottom-1 left-0 right-0 h-0.5 transition-all duration-200 ${leftSidebarOpen ? 'bg-[#0558a5]' : 'bg-transparent group-hover:bg-[#0972d3]'
              }`} />
          </button> */}

					<button
						onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
						className={`group relative px-4 py-2 text-xs font-medium transition-all duration-200 border-t border-b border-[#d5dbdb] hover:border-[#0972d3] ${
							rightSidebarOpen
								? "bg-[#0972d3] border-[#0558a5] text-white shadow-lg"
								: "bg-[#f8f9fa] text-[#687078] hover:bg-[#e9ecef] hover:text-[#0f1419]"
						}`}
						title={
							rightSidebarOpen ? "Hide Analysis Panel" : "Show Analysis Panel"
						}
					>
						<div className="flex items-center gap-2">
							<BarChart3 size={14} />
							<span>Analyze</span>
							{rightSidebarOpen ? <EyeOff size={12} /> : <Eye size={12} />}
						</div>
						<div
							className={`absolute -bottom-1 left-0 right-0 h-0.5 transition-all duration-200 ${
								rightSidebarOpen
									? "bg-[#0558a5]"
									: "bg-transparent group-hover:bg-[#0972d3]"
							}`}
						/>
					</button>

					<button
						onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
						className={`group relative px-4 py-2 text-xs font-medium transition-all duration-200 border border-[#d5dbdb] hover:border-[#0972d3] ${
							bottomPanelOpen
								? "bg-[#0972d3] border-[#0558a5] text-white shadow-lg"
								: "bg-[#f8f9fa] text-[#687078] hover:bg-[#e9ecef] hover:text-[#0f1419]"
						}`}
						style={{ borderRadius: "0 4px 4px 0" }}
						title={
							bottomPanelOpen
								? "Hide Operations Panel"
								: "Show Operations Panel"
						}
					>
						<div className="flex items-center gap-2">
							<Cog size={14} />
							<span>Ops</span>
							{bottomPanelOpen ? (
								<Minimize2 size={12} />
							) : (
								<Maximize2 size={12} />
							)}
						</div>
						<div
							className={`absolute -bottom-1 left-0 right-0 h-0.5 transition-all duration-200 ${
								bottomPanelOpen
									? "bg-[#0558a5]"
									: "bg-transparent group-hover:bg-[#0972d3]"
							}`}
						/>
					</button>
				</div>
			</div>

			{/* Main Layout */}
			<div className="flex-1 flex overflow-hidden col-span-1 row-span-2">
				{/* Left Sidebar */}
				{/* {leftSidebarOpen && (
          <div className="bg-white flex flex-col border-r border-[#d5dbdb] relative" style={{ width: `${leftSidebarWidth}px` }}>
            {renderSidebarTabs(['monitoring'], leftSidebarTab, setLeftSidebarTab)}
            {renderSidebarContent('monitoring', activeView, setActiveView)}
            <div
              className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-[#0972d3] transition-colors bg-transparent"
              onMouseDown={() => setIsResizing('left')}
              title="Resize panel"
            />
          </div>
        )} */}

				{/* Main Content Area */}
				<div className="flex-1 flex flex-col">
					<div className="flex-1 min-h-0">
						{currentValue ? (
							<Mosaic<ViewId>
								renderTile={renderTile}
								value={currentValue}
								onChange={setCurrentValue}
								className="mosaic-blueprint-theme"
							/>
						) : (
							<div className="flex items-center justify-center h-full bg-[#f2f3f3]">
								<div className="text-center">
									<div
										className="w-16 h-16 bg-[#232f3e] text-white text-xl font-bold flex items-center justify-center mb-4 mx-auto"
										style={{ borderRadius: "2px" }}
									>
										MAP
									</div>
									<h2 className="text-lg font-semibold text-[#0f1419] mb-2">
										Main Content
									</h2>
									<p className="text-sm text-[#687078]">
										Map and Region Details
									</p>
								</div>
							</div>
						)}
					</div>

					{/* Bottom Panel */}
					{bottomPanelOpen && (
						<div
							className="bottom-panel border-t border-[#d5dbdb] bg-white flex flex-col relative"
							style={{ height: `${bottomPanelHeight}px` }}
						>
							{/* Resize Handle */}
							<div
								className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-[#0972d3] transition-colors bg-transparent"
								onMouseDown={() => setIsResizing("bottom")}
								title="Resize panel"
							/>
							{renderSidebarTabs(
								["operations"],
								bottomPanelTab,
								setBottomPanelTab
							)}
							{renderSidebarContent(
								"operations",
								activeOperationsView,
								setActiveOperationsView
							)}
						</div>
					)}
				</div>

				{/* Right Sidebar */}
				{rightSidebarOpen && (
					<div
						className="bg-white flex flex-col border-l border-[#d5dbdb] relative"
						style={{ width: `${rightSidebarWidth}px` }}
					>
						{renderSidebarTabs(
							["analysis"],
							rightSidebarTab,
							setRightSidebarTab
						)}
						{renderSidebarContent(
							"analysis",
							activeAnalysisView,
							setActiveAnalysisView
						)}
						{/* Resize Handle */}
						<div
							className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-[#0972d3] transition-colors bg-transparent"
							onMouseDown={() => setIsResizing("right")}
							title="Resize panel"
						/>
					</div>
				)}
			</div>

			{/* AWS-style custom CSS */}
			<style>{`
        /* AWS-style mosaic theme overrides with reduced text sizes */
        .mosaic-blueprint-theme .mosaic-window-toolbar {
          background: #232f3e !important;
          border-bottom: 1px solid #3c4043 !important;
          color: #ffffff !important;
          padding: 6px 12px !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        /* Smaller headers for bottom panel specifically */
        .mosaic-blueprint-theme .mosaic-window-toolbar {
          min-height: 28px !important;
        }
        
        /* Extra small headers for bottom panels */
        .bottom-panel .mosaic-window-toolbar {
          padding: 4px 8px !important;
          font-size: 9px !important;
          min-height: 24px !important;
        }
        
        .bottom-panel .mosaic-window-title {
          font-size: 9px !important;
        }
        
        .mosaic-blueprint-theme .mosaic-window-title {
          color: #ffffff !important;
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          font-size: 10px !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        
        .mosaic-blueprint-theme .mosaic-window-body {
          background: #ffffff !important;
          border: 1px solid #d5dbdb !important;
        }
        
        .mosaic-blueprint-theme .mosaic-tile {
          background: #ffffff !important;
        }
        
        .mosaic-blueprint-theme .mosaic-split {
          background: #d5dbdb !important;
        }
        
        .mosaic-blueprint-theme .mosaic-split:hover {
          background: #aab7b8 !important;
        }
        
        /* AWS-style Button Styling with reduced sizes */
        [data-slot="button"] {
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          border-radius: 2px !important;
          font-weight: 500 !important;
          font-size: 12px !important;
          padding: 6px 12px !important;
          transition: all 0.15s ease-in-out !important;
          box-shadow: 0 1px 1px 0 rgba(0, 28, 36, 0.3) !important;
        }

        [data-slot="button"]:not(.bg-red-600):not(.border-gray-300):not(.bg-gray-100):not(.text-gray-700):not(.text-blue-600) {
          background: #0972d3 !important;
          border-color: #0558a5 !important;
          color: #ffffff !important;
        }

        [data-slot="button"]:not(.bg-red-600):not(.border-gray-300):not(.bg-gray-100):not(.text-gray-700):not(.text-blue-600):hover {
          background: #0558a5 !important;
          border-color: #034382 !important;
          color: #ffffff !important;
        }

        /* AWS-style Input Styling with reduced sizes */
        [data-slot="input"], [data-slot="textarea"] {
          font-family: 'Amazon Ember', 'Helvetica Neue', sans-serif !important;
          border: 1px solid #d5dbdb !important;
          border-radius: 2px !important;
          background: #ffffff !important;
          color: #0f1419 !important;
          font-size: 12px !important;
          padding: 6px 8px !important;
          transition: all 0.15s ease-in-out !important;
          box-shadow: inset 0 1px 2px rgba(0, 28, 36, 0.1) !important;
        }

        [data-slot="input"]:focus, [data-slot="textarea"]:focus {
          outline: none !important;
          border-color: #0972d3 !important;
          box-shadow: 0 0 0 2px rgba(9, 114, 211, 0.25), inset 0 1px 2px rgba(0, 28, 36, 0.1) !important;
        }

        /* Global text size reductions */
        body, html {
          font-size: 13px !important;
        }
        
        h1 { font-size: 1.5rem !important; }
        h2 { font-size: 1.25rem !important; }
        h3 { font-size: 1.1rem !important; }
        h4 { font-size: 1rem !important; }
        h5 { font-size: 0.9rem !important; }
        h6 { font-size: 0.8rem !important; }
        
        p, div, span, label {
          font-size: 12px !important;
          line-height: 1.4 !important;
        }
        
        /* Smaller text in panels */
        .mosaic-window-body p,
        .mosaic-window-body div,
        .mosaic-window-body span,
        .mosaic-window-body label {
          font-size: 11px !important;
        }
        
        /* Smaller input text */
        input, textarea, select {
          font-size: 11px !important;
        }
        
        /* Smaller table text */
        table, th, td {
          font-size: 11px !important;
        }

        /* AWS-style Scrollbars */
        ::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }

        ::-webkit-scrollbar-track {
          background: #f2f3f3 !important;
          border-radius: 2px !important;
        }

        ::-webkit-scrollbar-thumb {
          background: #aab7b8 !important;
          border-radius: 2px !important;
          border: 1px solid #f2f3f3 !important;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #879596 !important;
        }

        /* Enhanced resize handles */
        .resize-handle {
          position: relative;
          z-index: 10;
        }
        
        .resize-handle:hover::after {
          content: '';
          position: absolute;
          background: #0972d3;
          opacity: 0.3;
        }
        
        /* Prevent text selection during resize */
        .no-select {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        /* Enhanced collapse animations */
        .panel-content {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        
        .panel-content.collapsed {
          height: 0 !important;
          min-height: 0 !important;
          opacity: 0;
          transform: scaleY(0);
          transform-origin: top;
        }
        
        .panel-content.expanded {
          opacity: 1;
          transform: scaleY(1);
        }
        
        /* Panel control buttons */
        .panel-control-btn {
          transition: all 0.2s ease;
          border-radius: 2px;
        }
        
        .panel-control-btn:hover {
          background-color: rgba(255, 255, 255, 0.2);
          transform: scale(1.1);
        }
        
        .panel-control-btn:active {
          transform: scale(0.95);
        }
        
        /* Collapsed panel indicator */
        .collapsed-indicator {
          position: relative;
          overflow: hidden;
        }
        
        .collapsed-indicator::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #0972d3, #0558a5);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        /* Reopen button animation */
        .reopen-btn {
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        
        .reopen-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(9, 114, 211, 0.3), transparent);
          transition: left 0.5s ease;
        }
        
        .reopen-btn:hover::before {
          left: 100%;
        }
        
        .reopen-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(9, 114, 211, 0.3);
        }
      `}</style>

			{/* Error Message */}
			{error && (
				<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[2000] bg-red-50 border border-red-300 text-red-800 px-4 py-3 max-w-md shadow-sm">
					<div className="flex items-start gap-3">
						<svg
							className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
								clipRule="evenodd"
							/>
						</svg>
						<div className="flex-1">
							<p className="font-semibold text-red-900 text-xs">Error</p>
							<p className="text-xs text-red-700 mt-1">{error}</p>
						</div>
						<button
							onClick={() => setError(null)}
							className="text-red-500 hover:text-red-700 hover:bg-red-100 p-1 transition-colors"
							title="Dismiss error"
						>
							<svg
								className="w-3 h-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			)}

			{/* Critical Alert Overlay */}
			<CriticalAlertOverlay />

			{/* Toast Container */}
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />
		</div>
	);
}
