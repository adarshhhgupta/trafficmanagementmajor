import { useRef } from 'react';
import { UploadCloud, Play, Square, Ambulance, Car } from 'lucide-react';

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
  data,
  isProcessing,
  videoUrl,
  onUpload,
  onStart,
  onStop,
  videoRef,
  canvasRef
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  const hasAmbulance = data.ambulances > 0;
  const isGreen = data.signal === 'green';

  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 overflow-hidden
        ${hasAmbulance
          ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
          : isGreen
          ? 'border-green-500/50 shadow-[0_0_12px_rgba(74,222,128,0.15)]'
          : 'border-slate-700'
        } bg-[#1F2833]`}
    >
      {/* Ambulance Alert Banner */}
      {hasAmbulance && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-red-600 text-white text-xs font-bold text-center py-1 animate-pulse">
          🚨 AMBULANCE DETECTED — PRIORITY GREEN
        </div>
      )}

      {/* Card Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${hasAmbulance ? 'mt-6' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#66FCF1]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            LANE {laneNumber}
          </span>
          {isProcessing && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        {/* Traffic Signal */}
        <div className="flex items-center gap-1 bg-slate-900 rounded-full px-2 py-1">
          <SignalLight color="red" active={data.signal === 'red'} />
          <SignalLight color="yellow" active={data.signal === 'yellow'} />
          <SignalLight color="green" active={data.signal === 'green'} />
        </div>
      </div>

      {/* Video/Frame Display */}
      <div className="relative mx-4 mb-2 rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
        {data.frame ? (
          <img
            src={`data:image/jpeg;base64,${data.frame}`}
            alt={`Lane ${laneNumber} feed`}
            className="w-full h-full object-cover"
          />
        ) : videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            loop
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <UploadCloud size={32} />
            <span className="text-xs">No video feed</span>
          </div>
        )}

        {/* Hidden canvas for frame extraction */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Duration overlay */}
        {isGreen && data.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-green-600/80 text-white text-xs font-bold px-2 py-1 rounded">
            {data.duration}s
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mx-4 mb-3">
        <div className="bg-slate-900/60 rounded-lg p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-1">
            <Car size={12} />
            <span>Vehicles</span>
          </div>
          <div className="text-lg font-bold text-white">{data.vehicles}</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${hasAmbulance ? 'bg-red-900/40' : 'bg-slate-900/60'}`}>
          <div className="flex items-center justify-center gap-1 text-xs mb-1 text-slate-400">
            <Ambulance size={12} className={hasAmbulance ? 'text-red-400' : ''} />
            <span className={hasAmbulance ? 'text-red-400' : ''}>Ambul.</span>
          </div>
          <div className={`text-lg font-bold ${hasAmbulance ? 'text-red-400' : 'text-white'}`}>
            {data.ambulances}
          </div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-2 text-center">
          <div className="text-slate-400 text-xs mb-1">Density</div>
          <div className="text-lg font-bold text-[#66FCF1]">{data.density?.toFixed(1)}%</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
        >
          <UploadCloud size={14} />
          Upload Video
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {!isProcessing ? (
          <button
            onClick={onStart}
            disabled={!videoUrl}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-lg bg-[#66FCF1]/10 border border-[#66FCF1]/40 text-[#66FCF1] hover:bg-[#66FCF1]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={14} />
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 flex items-center justify-center gap-1 py-2 text-xs rounded-lg bg-red-900/20 border border-red-500/40 text-red-400 hover:bg-red-900/40 transition-colors"
          >
            <Square size={14} />
            Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoLaneCard;
