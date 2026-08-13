import { Activity, AlertTriangle, Car, TrendingUp } from 'lucide-react';

const TrafficAnalytics = ({ laneData }) => {
  const totalVehicles = Object.values(laneData).reduce((sum, lane) => sum + lane.vehicles, 0);
  const totalAmbulances = Object.values(laneData).reduce((sum, lane) => sum + lane.ambulances, 0);
  const greenLane = Object.entries(laneData).find(([_, lane]) => lane.signal === 'green');
  const avgDensity = Object.values(laneData).reduce((sum, lane) => sum + (lane.density || 0), 0) / 4;

  const laneColors = ['#66FCF1', '#45A29E', '#C5C6C7', '#1F2833'];
  const densityBars = Object.entries(laneData).map(([laneId, lane], i) => ({
    laneId,
    laneNumber: laneId.replace('lane', ''),
    density: lane.density || 0,
    vehicles: lane.vehicles,
    signal: lane.signal,
    color: laneColors[i]
  }));

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-4">
        <h2 className="text-sm font-bold text-[#66FCF1] mb-3 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <Activity size={16} />
          SYSTEM OVERVIEW
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/60 rounded-lg p-3">
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
              <Car size={11} />
              Total Vehicles
            </div>
            <div className="text-2xl font-bold text-white">{totalVehicles}</div>
          </div>
          <div className={`rounded-lg p-3 ${totalAmbulances > 0 ? 'bg-red-900/40' : 'bg-slate-900/60'}`}>
            <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <AlertTriangle size={11} className={totalAmbulances > 0 ? 'text-red-400' : ''} />
              <span className={totalAmbulances > 0 ? 'text-red-400' : ''}>Ambulances</span>
            </div>
            <div className={`text-2xl font-bold ${totalAmbulances > 0 ? 'text-red-400' : 'text-white'}`}>
              {totalAmbulances}
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Avg Density</div>
            <div className="text-2xl font-bold text-[#66FCF1]">{avgDensity.toFixed(1)}%</div>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Green Lane</div>
            <div className="text-2xl font-bold text-green-400">
              {greenLane ? `L${greenLane[0].replace('lane', '')}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Density Chart */}
      <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-4">
        <h2 className="text-sm font-bold text-[#66FCF1] mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <TrendingUp size={16} />
          LANE DENSITY
        </h2>

        <div className="space-y-3">
          {densityBars.map(({ laneId, laneNumber, density, vehicles, signal }) => (
            <div key={laneId}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-slate-400">Lane {laneNumber}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{vehicles} veh</span>
                  <div className={`w-2 h-2 rounded-full ${
                    signal === 'green' ? 'bg-green-400' : 'bg-red-500'
                  }`} />
                </div>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(density, 100)}%`,
                    backgroundColor: signal === 'green' ? '#4ade80' : '#66FCF1',
                    boxShadow: signal === 'green' ? '0 0 6px #4ade80' : 'none'
                  }}
                />
              </div>
              <div className="text-right text-xs text-slate-500 mt-0.5">{density.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Status */}
      <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-4">
        <h2 className="text-sm font-bold text-[#66FCF1] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
          SIGNAL STATUS
        </h2>
        <div className="space-y-2">
          {Object.entries(laneData).map(([laneId, lane], i) => (
            <div key={laneId} className="flex items-center justify-between py-1 border-b border-slate-800 last:border-0">
              <span className="text-xs text-slate-400">Lane {i + 1}</span>
              <div className="flex items-center gap-2">
                {lane.signal === 'green' && lane.duration > 0 && (
                  <span className="text-xs text-slate-500">{lane.duration}s</span>
                )}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  lane.signal === 'green'
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                }`}>
                  {lane.signal.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Note */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
        <p className="text-xs text-blue-300 leading-relaxed">
          <strong>Auto Mode:</strong> Signals switch based on vehicle density. Ambulance detected → that lane gets immediate 60s priority green.
        </p>
      </div>
    </div>
  );
};

export default TrafficAnalytics;
