import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Activity, Car, AlertTriangle, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const COLORS = ['#66FCF1', '#45A29E', '#C5C6C7', '#1F2833'];

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await axios.get(`${API}/analytics`);
        setAnalyticsData(response.data);
        
        // Store historical data for charts
        setHistory(prev => {
          const newEntry = {
            time: new Date().toLocaleTimeString(),
            ...response.data.summary,
            lanes: response.data.lanes
          };
          const updated = [...prev, newEntry];
          return updated.slice(-20); // Keep last 20 data points
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-[#0B0C10] text-[#C5C6C7] flex items-center justify-center">
        <div className="text-center">
          <Activity className="animate-spin mx-auto mb-4 text-[#66FCF1]" size={48} />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const laneData = analyticsData.lanes.map(lane => ({
    name: `Lane ${lane.lane_number}`,
    vehicles: lane.vehicles,
    ambulances: lane.ambulances,
    density: lane.density
  }));

  const signalData = analyticsData.lanes.map(lane => ({
    name: `Lane ${lane.lane_number}`,
    green: lane.signal === 'green' ? 1 : 0,
    red: lane.signal === 'red' ? 1 : 0
  }));

  const pieData = analyticsData.lanes.map((lane, index) => ({
    name: `Lane ${lane.lane_number}`,
    value: lane.vehicles,
    color: COLORS[index]
  }));

  const vehicleHistory = history.map(entry => ({
    time: entry.time,
    total: entry.total_vehicles
  }));

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#C5C6C7] p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#66FCF1] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Traffic Analytics
        </h1>
        <p className="text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
          Real-time traffic data analysis and visualization
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Car className="text-[#66FCF1]" size={24} />
            <span className="text-slate-400 text-sm">Total Vehicles</span>
          </div>
          <div className="text-3xl font-bold text-white">{analyticsData.summary.total_vehicles}</div>
        </div>

        <div className={`bg-[#1F2833] border rounded-xl p-6 ${analyticsData.summary.total_ambulances > 0 ? 'border-red-500' : 'border-slate-700'}`}>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className={analyticsData.summary.total_ambulances > 0 ? 'text-red-400' : 'text-slate-400'} size={24} />
            <span className="text-slate-400 text-sm">Ambulances</span>
          </div>
          <div className={`text-3xl font-bold ${analyticsData.summary.total_ambulances > 0 ? 'text-red-400' : 'text-white'}`}>
            {analyticsData.summary.total_ambulances}
          </div>
        </div>

        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-[#66FCF1]" size={24} />
            <span className="text-slate-400 text-sm">Avg Density</span>
          </div>
          <div className="text-3xl font-bold text-[#66FCF1]">{analyticsData.summary.avg_density}%</div>
        </div>

        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="text-green-400" size={24} />
            <span className="text-slate-400 text-sm">Mode</span>
          </div>
          <div className={`text-3xl font-bold ${analyticsData.summary.mode === 'vip' ? 'text-yellow-400' : 'text-green-400'}`}>
            {analyticsData.summary.mode.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Vehicle Distribution Bar Chart */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Vehicle Distribution by Lane
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={laneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #475569', borderRadius: '8px' }}
                itemStyle={{ color: '#C5C6C7' }}
              />
              <Legend />
              <Bar dataKey="vehicles" fill="#66FCF1" name="Vehicles" />
              <Bar dataKey="ambulances" fill="#ef4444" name="Ambulances" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Density Comparison */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Lane Density Comparison
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={laneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #475569', borderRadius: '8px' }}
                itemStyle={{ color: '#C5C6C7' }}
              />
              <Bar dataKey="density" fill="#45A29E" name="Density %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vehicle Distribution Pie Chart */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Vehicle Share by Lane
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #475569', borderRadius: '8px' }}
                itemStyle={{ color: '#C5C6C7' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Signal Status */}
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Signal Status Overview
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={signalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #475569', borderRadius: '8px' }}
                itemStyle={{ color: '#C5C6C7' }}
              />
              <Legend />
              <Bar dataKey="green" fill="#4ade80" name="Green" />
              <Bar dataKey="red" fill="#ef4444" name="Red" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Trend */}
      {vehicleHistory.length > 1 && (
        <div className="bg-[#1F2833] border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#66FCF1] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Total Vehicles Over Time
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vehicleHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2833', border: '1px solid #475569', borderRadius: '8px' }}
                itemStyle={{ color: '#C5C6C7' }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#66FCF1" strokeWidth={2} name="Total Vehicles" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default Analytics;
