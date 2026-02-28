'use client';

import { useState, useEffect } from 'react';
import { Activity, ArrowRight, Database, Zap, Bell, Eye, Cloud } from 'lucide-react';

interface ServiceNode {
  id: string;
  name: string;
  icon: string;
  type: 'compute' | 'storage' | 'analytics' | 'integration' | 'monitoring';
  x: number;
  y: number;
  status: 'active' | 'idle' | 'processing';
  connections: string[];
}

interface DataFlow {
  from: string;
  to: string;
  active: boolean;
  data: string;
}

export default function AWSArchitectureDiagram() {
  const [services] = useState<ServiceNode[]>([
    {
      id: 'sentinel2',
      name: 'Sentinel-2\nOpen Data',
      icon: '/aws-icons/s3.svg',
      type: 'storage',
      x: 50,
      y: 100,
      status: 'active',
      connections: ['lambda-search']
    },
    {
      id: 'lambda-search',
      name: 'Image Search\nLambda',
      icon: '/aws-icons/lambda.svg',
      type: 'compute',
      x: 200,
      y: 100,
      status: 'processing',
      connections: ['lambda-ndvi']
    },
    {
      id: 'lambda-ndvi',
      name: 'NDVI Calculator\nLambda',
      icon: '/aws-icons/lambda.svg',
      type: 'compute',
      x: 350,
      y: 100,
      status: 'processing',
      connections: ['s3-data']
    },
    {
      id: 's3-data',
      name: 'Floro\nData Bucket',
      icon: '/aws-icons/s3.svg',
      type: 'storage',
      x: 500,
      y: 100,
      status: 'active',
      connections: ['sagemaker']
    },
    {
      id: 'sagemaker',
      name: 'K-Means\nClustering',
      icon: '/aws-icons/sagemaker.svg',
      type: 'analytics',
      x: 350,
      y: 250,
      status: 'processing',
      connections: ['lambda-consolidate']
    },
    {
      id: 'lambda-consolidate',
      name: 'Results\nConsolidator',
      icon: '/aws-icons/lambda.svg',
      type: 'compute',
      x: 200,
      y: 250,
      status: 'processing',
      connections: ['sns', 'cloudwatch']
    },
    {
      id: 'step-functions',
      name: 'Deforestation\nPipeline',
      icon: '/aws-icons/stepfunctions.svg',
      type: 'integration',
      x: 275,
      y: 175,
      status: 'active',
      connections: []
    },
    {
      id: 'sns',
      name: 'Alert\nNotifications',
      icon: '/aws-icons/sns.svg',
      type: 'integration',
      x: 50,
      y: 250,
      status: 'idle',
      connections: []
    },
    {
      id: 'cloudwatch',
      name: 'CloudWatch\nLogs & Metrics',
      icon: '/aws-icons/cloudwatch.svg',
      type: 'monitoring',
      x: 200,
      y: 400,
      status: 'active',
      connections: []
    }
  ]);

  const [dataFlows, setDataFlows] = useState<DataFlow[]>([]);
  const [activeFlow, setActiveFlow] = useState<number>(0);

  // Create data flows based on service connections
  useEffect(() => {
    const flows: DataFlow[] = [];
    services.forEach(service => {
      service.connections.forEach(connectionId => {
        flows.push({
          from: service.id,
          to: connectionId,
          active: false,
          data: getDataTypeForConnection(service.id, connectionId)
        });
      });
    });
    setDataFlows(flows);
  }, [services]);

  // Animate data flows
  useEffect(() => {
    const interval = setInterval(() => {
      setDataFlows(prev => prev.map((flow, index) => ({
        ...flow,
        active: index === activeFlow
      })));
      setActiveFlow(prev => (prev + 1) % dataFlows.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [dataFlows.length, activeFlow]);

  const getDataTypeForConnection = (from: string, to: string): string => {
    const dataTypes: Record<string, string> = {
      'sentinel2-lambda-search': 'Satellite imagery query',
      'lambda-search-lambda-ndvi': 'Band data (B04, B08)',
      'lambda-ndvi-s3-data': 'NDVI pixel arrays',
      's3-data-sagemaker': 'Training dataset',
      'sagemaker-lambda-consolidate': 'Cluster models',
      'lambda-consolidate-sns': 'Alert notifications',
      'lambda-consolidate-cloudwatch': 'Metrics & logs'
    };
    return dataTypes[`${from}-${to}`] || 'Data';
  };

  const getServiceColor = (type: string) => {
    switch (type) {
      case 'compute': return '#FF9900';
      case 'storage': return '#3F48CC';
      case 'analytics': return '#7D4CDB';
      case 'integration': return '#1BA86D';
      case 'monitoring': return '#E52207';
      default: return '#687078';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#037f0c';
      case 'processing': return '#ff9900';
      case 'idle': return '#687078';
      default: return '#687078';
    }
  };

  const getServiceById = (id: string) => services.find(s => s.id === id);

  return (
    <div className="h-full bg-white p-4 overflow-hidden">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#0f1419] mb-2">AWS Floro Architecture</h3>
        <p className="text-sm text-[#687078]">Real-time data flow visualization of vegetation stress detection pipeline</p>
      </div>

      {/* Architecture Diagram */}
      <div className="relative bg-[#f2f3f3] border border-[#d5dbdb] h-[500px] overflow-auto">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Draw connections */}
          {dataFlows.map((flow, index) => {
            const fromService = getServiceById(flow.from);
            const toService = getServiceById(flow.to);
            if (!fromService || !toService) return null;

            const fromX = fromService.x + 40;
            const fromY = fromService.y + 20;
            const toX = toService.x + 40;
            const toY = toService.y + 20;

            return (
              <g key={`${flow.from}-${flow.to}`}>
                {/* Connection line */}
                <line
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke={flow.active ? '#ff9900' : '#d5dbdb'}
                  strokeWidth={flow.active ? 3 : 2}
                  strokeDasharray={flow.active ? '0' : '5,5'}
                  className={flow.active ? 'animate-pulse' : ''}
                />
                
                {/* Arrow */}
                <polygon
                  points={`${toX-8},${toY-4} ${toX},${toY} ${toX-8},${toY+4}`}
                  fill={flow.active ? '#ff9900' : '#d5dbdb'}
                />

                {/* Data label */}
                {flow.active && (
                  <text
                    x={(fromX + toX) / 2}
                    y={(fromY + toY) / 2 - 10}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-[#0f1419]"
                    style={{ fontSize: '10px' }}
                  >
                    {flow.data}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Service nodes */}
        {services.map(service => (
          <div
            key={service.id}
            className="absolute bg-white border-2 p-3 shadow-lg group hover:shadow-xl transition-all cursor-pointer"
            style={{
              left: service.x,
              top: service.y,
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              borderColor: getServiceColor(service.type)
            }}
          >
            <div className="flex flex-col items-center h-full">
              <img
                src={`/aws-icons/${service.icon}.svg`}
                alt={service.name}
                className="w-6 h-6 mb-1"
              />
              <div className="text-[8px] text-center font-semibold text-[#0f1419] leading-tight">
                {service.name}
              </div>
              <div
                className="w-2 h-2 rounded-full mt-1"
                style={{ backgroundColor: getStatusColor(service.status) }}
                title={service.status}
              />
            </div>

            {/* Tooltip */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#232f3e] text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
              <div className="font-semibold">{service.name.replace('\n', ' ')}</div>
              <div className="text-gray-300 capitalize">{service.type} • {service.status}</div>
            </div>
          </div>
        ))}

        {/* Step Functions orchestration indicator */}
        <div className="absolute top-4 right-4 bg-[#1BA86D] text-white p-2 text-xs font-semibold flex items-center gap-2"
             style={{ borderRadius: '4px' }}>
          <Zap className="w-4 h-4" />
          Step Functions Orchestrating
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-5 gap-4 text-xs">
        {[
          { type: 'compute', label: 'Compute', color: '#FF9900' },
          { type: 'storage', label: 'Storage', color: '#3F48CC' },
          { type: 'analytics', label: 'Analytics', color: '#7D4CDB' },
          { type: 'integration', label: 'Integration', color: '#1BA86D' },
          { type: 'monitoring', label: 'Monitoring', color: '#E52207' }
        ].map(item => (
          <div key={item.type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 border"
              style={{ backgroundColor: item.color, borderRadius: '3px' }}
            />
            <span className="text-[#687078] font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Real-time stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-[#f0f8ff] border border-[#0972d3] p-3" style={{ borderRadius: '4px' }}>
          <div className="text-lg font-bold text-[#0972d3]">
            {dataFlows.filter(f => f.active).length}
          </div>
          <div className="text-xs text-[#687078] uppercase tracking-wide">Active Flows</div>
        </div>
        <div className="bg-[#f0f8f0] border border-[#037f0c] p-3" style={{ borderRadius: '4px' }}>
          <div className="text-lg font-bold text-[#037f0c]">
            {services.filter(s => s.status === 'active' || s.status === 'processing').length}
          </div>
          <div className="text-xs text-[#687078] uppercase tracking-wide">Services Online</div>
        </div>
        <div className="bg-[#fffbf0] border border-[#ff9900] p-3" style={{ borderRadius: '4px' }}>
          <div className="text-lg font-bold text-[#ff9900]">
            {services.filter(s => s.status === 'processing').length}
          </div>
          <div className="text-xs text-[#687078] uppercase tracking-wide">Processing</div>
        </div>
      </div>
    </div>
  );
} 