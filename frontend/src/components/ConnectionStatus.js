import React from 'react';
import { Radio, RefreshCw, AlertTriangle } from 'lucide-react';

const ConnectionStatus = ({ status, isConnected }) => {
  if (status === 'live' && isConnected) {
    return (
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-full font-medium shadow-[0_0_10px_rgba(74,222,128,0.2)]">
        <Radio size={14} className="animate-pulse" />
        <span>RTSP STREAM: LIVE</span>
      </div>
    );
  }

  if (status === 'reconnecting') {
    return (
      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-3 py-1.5 rounded-full font-medium">
        <RefreshCw size={14} className="animate-spin" />
        <span>RECONNECTING RTSP...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs px-3 py-1.5 rounded-full font-medium">
      <AlertTriangle size={14} />
      <span>DEMO / FALLBACK MODE ACTIVE</span>
    </div>
  );
};

export default ConnectionStatus;
