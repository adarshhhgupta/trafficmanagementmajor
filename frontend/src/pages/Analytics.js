import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { BarChart3, Database, Activity, TrendingUp, Clock } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/analytics`);
        setAnalyticsData(res.data);
      } catch (err) {
        console.error("Analytics fetch error", err);
      }
    };
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 3000);
    return () => clearInterval(interval);
  }, []);

  const lanes = analyticsData?.lanes || [
    { lane_id: 'lane1', lane_number: '1', vehicles: 4, density: 15, pedestrians: 1, signal: 'green' },
    { lane_id: 'lane2', lane_number: '2', vehicles: 2, density: 8, pedestrians: 0, signal: 'red' },
    { lane_id: 'lane3', lane_number: '3', vehicles: 7, density: 25, pedestrians: 2, signal: 'red' },
    { lane_id: 'lane4', lane_number: '4', vehicles: 1, density: 4, pedestrians: 0, signal: 'red' },
  ];

  const timescaleInsights = analyticsData?.timescale_insights || {
    predicted_peak_status: 'Moderate',
    avg_vehicles_per_min: 3.5,
    avg_density_percentage: 13.0,
    total_pedestrians: 3,
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-100 p-4 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="text-[#66FCF1]" size={24} />
          <h1 className="text-xl font-bold tracking-tight text-white">
            TIMESCALE DB TRAFFIC ANALYTICS & PREDICTIONS
          </h1>
        </div>
        <p className="text-slate-400 text-xs mt-1">
          Historical time-series hypertable analytics, density distribution, and peak hour forecasts.
        </p>
      </div>

      {/* Top Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1F2833] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs">PREDICTED PEAK STATUS</div>
            <div className="text-lg font-bold text-amber-400 mt-1">{timescaleInsights.predicted_peak_status}</div>
          </div>
          <Clock className="text-amber-400" size={24} />
        </div>

        <div className="bg-[#1F2833] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs">AVG VEHICLES / MIN</div>
            <div className="text-lg font-bold text-[#66FCF1] mt-1">{timescaleInsights.avg_vehicles_per_min}</div>
          </div>
          <TrendingUp className="text-[#66FCF1]" size={24} />
        </div>

        <div className="bg-[#1F2833] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs">AVG INTERSECTION DENSITY</div>
            <div className="text-lg font-bold text-green-400 mt-1">{timescaleInsights.avg_density_percentage}%</div>
          </div>
          <Activity className="text-green-400" size={24} />
        </div>

        <div className="bg-[#1F2833] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-xs">STORAGE ENGINE</div>
            <div className="text-lg font-bold text-cyan-400 mt-1">TimescaleDB Hypertable</div>
          </div>
          <Database className="text-cyan-400" size={24} />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lane Volume Bar Chart */}
        <div className="bg-[#1F2833] border border-slate-800 p-4 rounded-xl">
          <h2 className="text-sm font-bold text-slate-300 mb-4">Current Vehicle Volume by Lane</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lanes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="lane_id" stroke="#A0AEC0" />
                <YAxis stroke="#A0AEC0" />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568' }} />
                <Bar dataKey="vehicles" fill="#66FCF1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Density Line Chart */}
        <div className="bg-[#1F2833] border border-slate-800 p-4 rounded-xl">
          <h2 className="text-sm font-bold text-slate-300 mb-4">Lane Area Occupancy Density (%)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lanes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                <XAxis dataKey="lane_id" stroke="#A0AEC0" />
                <YAxis stroke="#A0AEC0" />
                <Tooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#4A5568' }} />
                <Line type="monotone" dataKey="density" stroke="#4ADE80" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
