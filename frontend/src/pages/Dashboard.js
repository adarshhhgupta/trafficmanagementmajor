import React from 'react';
import VideoLaneCard from '../components/VideoLaneCard';
import ConnectionStatus from '../components/ConnectionStatus';
import { useTrafficSocket } from '../hooks/useTrafficSocket';
import { Shield, Zap, RefreshCw, Activity, AlertOctagon } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Dashboard = () => {
  const { laneData, isConnected, connectionStatus } = useTrafficSocket();

  const handleManualFallbackUpload = async (laneId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      toast.info(`Uploading manual frame for ${laneId}...`);
      await axios.post(`${BACKEND_URL}/api/process-frame/${laneId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Manual frame processed for ${laneId}`);
    } catch (err) {
      toast.error(`Failed to process frame for ${laneId}`);
    }
  };

  const handleGreenWaveToggle = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/green-wave?active=true`);
      toast.success(res.data.message);
    } catch (err) {
      toast.error('Failed to trigger Green Wave coordination');
    }
  };

  const handleResetSystem = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/reset`);
      toast.success('System reset successfully');
    } catch (err) {
      toast.error('Failed to reset system');
    }
  };

  const lanes = ['lane1', 'lane2', 'lane3', 'lane4'];

  // Aggregate stats
  const totalVehicles = Object.values(laneData).reduce((sum, d) => sum + (d.vehicles || 0), 0);
  const totalAmbulances = Object.values(laneData).reduce((sum, d) => sum + (d.ambulances || 0), 0);
  const totalPedestrians = Object.values(laneData).reduce((sum, d) => sum + (d.pedestrians || 0), 0);
  const avgDensity = Object.values(laneData).length
    ? (Object.values(laneData).reduce((sum, d) => sum + (d.density || 0), 0) / 4).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-100 p-4 md:p-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              URBAN PULSE <span className="text-[#66FCF1] font-mono text-sm font-normal">v2.0</span>
            </h1>
            <ConnectionStatus status={connectionStatus} isConnected={isConnected} />
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Adaptive AI Traffic Sensing, RTSP Live Streams, TimescaleDB & Multi-Intersection Emergency Priority
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGreenWaveToggle}
            className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 px-3 py-2 rounded-lg text-xs font-semibold transition"
          >
            <Zap size={14} />
            <span>Trigger Green Wave Corridor</span>
          </button>

          <button
            onClick={handleResetSystem}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 px-3 py-2 rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw size={14} />
            <span>Reset System</span>
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 columns: 4 Lanes Video Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {lanes.map((laneId, idx) => (
            <VideoLaneCard
              key={laneId}
              laneId={laneId}
              laneNumber={idx + 1}
              data={laneData[laneId] || {}}
              onUpload={handleManualFallbackUpload}
            />
          ))}
        </div>

        {/* Right 1 column: Overview Metrics & Controls */}
        <div className="space-y-4">
          {/* Summary Panel */}
          <div className="bg-[#1F2833] rounded-xl border border-slate-800 p-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} className="text-[#66FCF1]" />
              System Metrics
            </h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">TOTAL VEHICLES</div>
                <div className="text-xl font-bold text-slate-100">{totalVehicles}</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">AMBULANCES</div>
                <div className={`text-xl font-bold ${totalAmbulances > 0 ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
                  {totalAmbulances}
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">PEDESTRIANS</div>
                <div className="text-xl font-bold text-purple-400">{totalPedestrians}</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">AVG DENSITY</div>
                <div className="text-xl font-bold text-[#66FCF1]">{avgDensity}%</div>
              </div>
            </div>
          </div>

          {/* Lane Status Table */}
          <div className="bg-[#1F2833] rounded-xl border border-slate-800 p-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield size={16} className="text-green-400" />
              Signal Allocation
            </h2>

            <div className="space-y-2 text-xs">
              {lanes.map((laneId, idx) => {
                const info = laneData[laneId] || {};
                const isGreen = info.signal === 'green';
                return (
                  <div key={laneId} className="flex items-center justify-between p-2 rounded bg-slate-900/40 border border-slate-800">
                    <span className="font-semibold text-slate-300">LANE {idx + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isGreen ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isGreen ? `GREEN (${info.duration || 0}s)` : 'RED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Architecture Note Card */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <AlertOctagon size={16} />
              <span>RTSP Pipeline Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Urban Pulse ingests live RTSP camera feeds in background workers, logs time-series data to TimescaleDB, and pushes frames over WebSockets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
