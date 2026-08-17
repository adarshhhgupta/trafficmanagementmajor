import { useRef } from 'react';
import { UploadCloud, Users, AlertTriangle, ShieldAlert } from 'lucide-react';

const SignalLight = ({ color, active }) => {
  const colors = {
    red: active ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-red-900/30',
    yellow: active ? 'bg-yellow-400 shadow-[0_0_12px_#facc15]' : 'bg-yellow-900/30',
    green: active ? 'bg-green-400 shadow-[0_0_12px_#4ade80]' : 'bg-green-900/30',
  };

  return (
    <div className={`w-4 h-4 rounded-full transition-all duration-500 ${colors[color]}`} />
  );
};

const VideoLaneCard = ({
  laneId,
  laneNumber,
  data = {},
  onUpload,
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onUpload) onUpload(laneId, file);
  };

  const hasAmbulance = (data.ambulances || 0) > 0;
  const isGreen = data.signal === 'green';
  const mode = data.mode || 'normal';
  const isVip = mode === 'vip';
  const isGreenWave = mode === 'green_wave';
  const pedestrians = data.pedestrians || 0;
  const anomalies = data.anomalies || 0;

  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 overflow-hidden
        ${hasAmbulance
          ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
          : isVip
          ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
          : isGreenWave
          ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
          : isGreen
          ? 'border-green-500/50 shadow-[0_0_12px_rgba(74,222,128,0.2)]'
          : 'border-slate-700'
        } bg-[#1F2833]`}
    >
      {/* Alert Banners */}
      {hasAmbulance && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-600 text-white text-xs font-bold text-center py-1 animate-pulse">
          🚨 AMBULANCE DETECTED — PRIORITY 60s GREEN OVERRIDE
        </div>
      )}
      {isVip && !hasAmbulance && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-amber-600 text-white text-xs font-bold text-center py-1">
          👑 VIP MOTORCADE OVERRIDE ACTIVE
        </div>
      )}
      {isGreenWave && !hasAmbulance && !isVip && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-cyan-600 text-white text-xs font-bold text-center py-1">
          🌊 GREEN WAVE CORRIDOR COORDINATION ACTIVE
        </div>
      )}

      {/* Card Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${hasAmbulance || isVip || isGreenWave ? 'mt-6' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#66FCF1]">
            LANE {laneNumber}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
            data.rtsp_status === 'live' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
          }`}>
            {data.rtsp_status || 'RTSP FEED'}
          </span>
        </div>

        {/* Traffic Signal */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-full px-2 py-1 border border-slate-800">
          <SignalLight color="red" active={data.signal === 'red'} />
          <SignalLight color="yellow" active={data.signal === 'yellow'} />
          <SignalLight color="green" active={data.signal === 'green'} />
        </div>
      </div>

      {/* Video / Frame Display */}
      <div className="relative mx-4 mb-2 rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-800">
        {data.frame ? (
          <img
            src={`data:image/jpeg;base64,${data.frame}`}
            alt={`Lane ${laneNumber} feed`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <UploadCloud size={32} className="animate-pulse" />
            <span className="text-xs">Connecting RTSP Stream...</span>
          </div>
        )}

        {/* Dynamic Badges */}
        {pedestrians > 0 && (
          <div className="absolute bottom-2 left-2 bg-purple-600/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
            <Users size={12} />
            <span>{pedestrians} Pedestrian(s)</span>
          </div>
        )}

        {anomalies > 0 && (
          <div className="absolute bottom-2 right-2 bg-orange-600/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
            <AlertTriangle size={12} />
            <span>Anomaly Flag</span>
          </div>
        )}
      </div>

      {/* Lane Stats Grid */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800 bg-slate-900/50 text-center py-2 text-xs">
        <div>
          <div className="text-slate-400 text-[10px]">VEHICLES</div>
          <div className="text-base font-bold text-slate-100">{data.vehicles || 0}</div>
        </div>
        <div>
          <div className="text-slate-400 text-[10px]">AMBULANCES</div>
          <div className={`text-base font-bold ${hasAmbulance ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>
            {data.ambulances || 0}
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-[10px]">DENSITY</div>
          <div className="text-base font-bold text-[#66FCF1]">{(data.density || 0).toFixed(1)}%</div>
        </div>
      </div>

      {/* Manual Demo Fallback Upload */}
      <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition"
        >
          <UploadCloud size={14} />
          <span>Manual Fallback Demo</span>
        </button>
        <span className="text-[10px] text-slate-500 font-mono">
          Timer: {data.duration || 0}s
        </span>
      </div>
    </div>
  );
};

export default VideoLaneCard;
