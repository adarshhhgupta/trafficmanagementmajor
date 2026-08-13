import { useState, useEffect } from 'react';
import axios from 'axios';
import { Crown, Shield, Clock, AlertTriangle, Power, Zap } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const VIPControl = () => {
  const [vipStatus, setVipStatus] = useState({ vip_mode: false, vip_override_lane: null, remaining_time: 0 });
  const [selectedLane, setSelectedLane] = useState('lane1');
  const [duration, setDuration] = useState(300);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVipStatus = async () => {
      try {
        const response = await axios.get(`${API}/vip-status`);
        setVipStatus(response.data);
      } catch (error) {
        console.error('Error fetching VIP status:', error);
      }
    };

    fetchVipStatus();
    const interval = setInterval(fetchVipStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const activateVIP = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/vip-mode`, null, {
        params: { lane_id: selectedLane, duration }
      });
      toast.success(`VIP mode activated for Lane ${selectedLane.replace('lane', '')}`);
      
      // Refresh status
      const response = await axios.get(`${API}/vip-status`);
      setVipStatus(response.data);
    } catch (error) {
      console.error('Error activating VIP mode:', error);
      toast.error('Failed to activate VIP mode');
    } finally {
      setLoading(false);
    }
  };

  const deactivateVIP = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/vip-mode/disable`);
      toast.success('VIP mode deactivated - returning to automatic control');
      
      // Refresh status
      const response = await axios.get(`${API}/vip-status`);
      setVipStatus(response.data);
    } catch (error) {
      console.error('Error deactivating VIP mode:', error);
      toast.error('Failed to deactivate VIP mode');
    } finally {
      setLoading(false);
    }
  };

  const lanes = [
    { id: 'lane1', name: 'Lane 1', description: 'Northbound' },
    { id: 'lane2', name: 'Lane 2', description: 'Southbound' },
    { id: 'lane3', name: 'Lane 3', description: 'Eastbound' },
    { id: 'lane4', name: 'Lane 4', description: 'Westbound' }
  ];

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#C5C6C7] p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-yellow-500/10 rounded-lg">
            <Crown className="text-yellow-400" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-yellow-400" style={{ fontFamily: 'Manrope, sans-serif' }}>
              VIP Control Center
            </h1>
            <p className="text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              Manual traffic signal override for emergency vehicles and VIP transit
            </p>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className={`bg-[#1F2833] border rounded-xl p-6 mb-8 ${vipStatus.vip_mode ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-slate-700'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className={vipStatus.vip_mode ? 'text-yellow-400' : 'text-slate-500'} size={24} />
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Current Status
            </h2>
          </div>
          <div className={`px-4 py-2 rounded-full font-bold ${
            vipStatus.vip_mode 
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
              : 'bg-green-500/20 text-green-400 border border-green-500/50'
          }`}>
            {vipStatus.vip_mode ? 'VIP MODE ACTIVE' : 'AUTOMATIC MODE'}
          </div>
        </div>

        {vipStatus.vip_mode && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <Zap size={20} />
              <span className="font-semibold">
                Priority Lane: {vipStatus.vip_override_lane?.replace('lane', '')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Clock size={20} />
              <span>
                Remaining Time: {Math.ceil(vipStatus.remaining_time)} seconds
              </span>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-yellow-400 mt-0.5" size={18} />
                <p className="text-sm text-yellow-200">
                  VIP mode will automatically expire after 5 minutes. You can manually deactivate it at any time.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lane Selection */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#66FCF1] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Select Priority Lane
          </h3>
          <div className="space-y-3">
            {lanes.map((lane) => (
              <button
                key={lane.id}
                onClick={() => setSelectedLane(lane.id)}
                disabled={vipStatus.vip_mode}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedLane === lane.id
                    ? 'border-[#66FCF1] bg-[#66FCF1]/10'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                } ${vipStatus.vip_mode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{lane.name}</div>
                    <div className="text-sm text-slate-400">{lane.description}</div>
                  </div>
                  {selectedLane === lane.id && (
                    <div className="w-3 h-3 rounded-full bg-[#66FCF1]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration Selection */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#66FCF1] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Set Duration
          </h3>
          <div className="space-y-3">
            {[60, 120, 180, 300].map((time) => (
              <button
                key={time}
                onClick={() => setDuration(time)}
                disabled={vipStatus.vip_mode}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  duration === time
                    ? 'border-[#66FCF1] bg-[#66FCF1]/10'
                    : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                } ${vipStatus.vip_mode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">{time} seconds</div>
                  <div className="text-sm text-slate-400">
                    {time === 60 ? '1 minute' : time === 120 ? '2 minutes' : time === 180 ? '3 minutes' : '5 minutes'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        {!vipStatus.vip_mode ? (
          <button
            onClick={activateVIP}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 rounded-xl font-bold text-lg hover:bg-yellow-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Crown size={24} />
            {loading ? 'Activating...' : 'Activate VIP Mode'}
          </button>
        ) : (
          <button
            onClick={deactivateVIP}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-3 py-4 bg-red-500/20 border-2 border-red-500 text-red-400 rounded-xl font-bold text-lg hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Power size={24} />
            {loading ? 'Deactivating...' : 'Deactivate VIP Mode'}
          </button>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
          <AlertTriangle size={20} />
          Important Information
        </h3>
        <ul className="space-y-2 text-sm text-blue-200">
          <li>• VIP mode overrides automatic traffic signal control</li>
          <li>• Only the selected lane will have a green signal</li>
          <li>• All other lanes will be set to red</li>
          <li>• Maximum duration is 5 minutes for safety</li>
          <li>• Use only for emergency vehicles or authorized VIP transit</li>
          <li>• System will automatically return to automatic mode after timeout</li>
        </ul>
      </div>
    </div>
  );
};

export default VIPControl;
