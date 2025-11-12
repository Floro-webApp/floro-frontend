"use client";

import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { useEffect } from "react";

// The latlng intensity is a 3-tuple: [latitude, longitude, intensity]
type HeatmapPoint = [number, number, number];

interface HeatmapLayerProps {
  points: HeatmapPoint[];
  options?: L.HeatMapOptions;
}

const HeatmapLayer = ({ points, options }: HeatmapLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) {
      return;
    }

    const heatLayer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 18,
      ...options,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, options]);

  return null;
};

export default HeatmapLayer; 