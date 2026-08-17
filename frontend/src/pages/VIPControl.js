import React, { useState } from 'react';
import { Crown, ShieldCheck, Off } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const VIPControl = () => {
  const [selectedLane, setSelectedLane] = useState('lane1');
  const [duration, setDuration] = useState(300);

  const handleActivateVIP = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/vip-mode`, {
        lane_id: selectedLane,
        duration: parseInt(duration, 10),
      });
      toast.success(res.data.message);
    } catch (err) {
      toast.error('Failed to activate VIP mode');
    }
  };

  const handleDisableVIP = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/vip-mode/disable`);
      toast.success(res.data.message);
    } catch (err) {
      toast.error('Failed to disable VIP mode');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-100 p-4 md:p-8 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Crown className="text-amber-400" size={24} />
          <h1 className="text-xl font-bold tracking-tight text-white">
            VIP MOTORCADE MANUAL OVERRIDE CONTROL
          </h1>
        </div>
        <p className="text-slate-400 text-xs mt-1">
          Force immediate priority green light signals for official VIP motorcades.
        </p>
      </div>

      <div className="max-w-xl bg-[#1F2833] border border-slate-800 p-6 rounded-xl space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
            Select VIP Route Lane
          </label>
          <div className="grid grid-cols-2 gap-3">
            {['lane1', 'lane2', 'lane3', 'lane4'].map((lane) => (
              <button
                key={lane}
                onClick={() => setSelectedLane(lane)}
                className={`p-3 rounded-lg text-sm font-semibold border transition ${
                  selectedLane === lane
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                    : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {lane.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
            Override Duration (Seconds)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleActivateVIP}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ShieldCheck size={18} />
            <span>ACTIVATE VIP GREEN</span>
          </button>

          <button
            onClick={handleDisableVIP}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-4 rounded-lg transition"
          >
            DISABLE OVERRIDE
          </button>
        </div>
      </div>
    </div>
  );
};

export default VIPControl;
