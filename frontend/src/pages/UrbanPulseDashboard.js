import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Zap,
  Activity,
  Radio,
  Clock,
  Car,
  Siren,
  Users,
  Compass,
  TrendingUp,
  AlertOctagon,
  ArrowUpRight,
  Camera
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Custom Warm Tooltip for Recharts
const CustomTrafficTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1b1815] border border-[#383028] p-3 rounded-lg shadow-2xl text-xs space-y-1 z-50">
        <div className="text-stone-400 font-mono flex items-center justify-between gap-4">
          <span>{label} IST</span>
          <span className="text-[#D97706] font-semibold">{data.vehicles} veh/min</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-stone-300">
          <span>Baseline:</span>
          <span className="font-mono text-stone-400">{data.baseline} veh/min</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Deviation:</span>
          <span className={`font-mono font-bold ${data.vehicles >= data.baseline ? 'text-amber-400' : 'text-emerald-400'}`}>
            {data.vehicles >= data.baseline ? `+${data.vehicles - data.baseline}` : `${data.vehicles - data.baseline}`} ({data.deviation}%)
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function UrbanPulseDashboard() {
  // --- STATE FOR GREEN WAVE CORRIDOR ---
  const [greenWaveActive, setGreenWaveActive] = useState(false);
  const [greenWaveTimer, setGreenWaveTimer] = useState(0);
  const [activeAmbulances, setActiveAmbulances] = useState(1);
  const [feedMode, setFeedMode] = useState('optical'); // 'optical' | 'thermal'
  const [customVideoUrl] = useState(null);

  // --- STATE FOR INTERSECTION SIGNAL PHASES ---
  // Phase 0: N-S Green, E-W Red
  // Phase 1: N-S Amber, E-W Red
  // Phase 2: E-W Green, N-S Red
  // Phase 3: E-W Amber, N-S Red
  const [signalPhase, setSignalPhase] = useState(0);
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(24);
  const [selectedApproach, setSelectedApproach] = useState('all'); // 'N', 'S', 'E', 'W', 'all'

  // --- LIVE VEHICLES IN INTERSECTION (SVG SIMULATION PARTICLES) ---
  const [vehicles, setVehicles] = useState([
    { id: 1, x: 250, y: 40, targetX: 250, targetY: 460, dir: 'N', type: 'car', color: '#f59e0b', progress: 0.1 },
    { id: 2, x: 265, y: 90, targetX: 265, targetY: 460, dir: 'N', type: 'bus', color: '#e5e7eb', progress: 0.2 },
    { id: 3, x: 235, y: 440, targetX: 235, targetY: 30, dir: 'S', type: 'auto', color: '#fbbf24', progress: 0.15 },
    { id: 4, x: 250, y: 390, targetX: 250, targetY: 30, dir: 'S', type: 'car', color: '#93c5fd', progress: 0.3 },
    { id: 5, x: 40, y: 235, targetX: 460, targetY: 235, dir: 'W', type: 'ambulance', color: '#ef4444', progress: 0.28 },
    { id: 6, x: 90, y: 250, targetX: 460, targetY: 250, dir: 'W', type: 'auto', color: '#fde047', progress: 0.08 },
    { id: 7, x: 450, y: 265, targetX: 40, targetY: 265, dir: 'E', type: 'car', color: '#e2e8f0', progress: 0.18 },
    { id: 8, x: 390, y: 250, targetX: 40, targetY: 250, dir: 'bus', color: '#fb923c', progress: 0.35 },
  ]);

  // --- DRIFTING BOUNDING BOXES FOR 4 CAMERA FEEDS ---
  const [driftOffsets, setDriftOffsets] = useState([
    { x: 0, y: 0, confidence: 0.94, tag: 'car' },
    { x: 0, y: 0, confidence: 0.91, tag: 'auto' },
    { x: 0, y: 0, confidence: 0.96, tag: 'bus' },
    { x: 0, y: 0, confidence: 0.99, tag: 'ambulance', isAmbulance: true },
  ]);

  // --- LIVE TOTAL VEHICLE COUNT ---
  const [liveVehicleCount, setLiveVehicleCount] = useState(248);

  // --- LIVE CLOCK ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- 4 APPROACHES METADATA ---
  const approaches = useMemo(() => [
    {
      id: 'N',
      name: 'Approach North',
      corridor: 'MG Road (towards Cubbon Park)',
      vehicles: 38,
      speed: '28 km/h',
      queue: '42m',
      laneCount: 3,
      camId: 'CAM-01-N-MGRD',
      fps: '25.0',
      bitrate: '3.8 Mb/s',
      signal: greenWaveActive ? 'green' : (signalPhase === 0 ? 'green' : signalPhase === 1 ? 'amber' : 'red'),
      countdown: greenWaveActive ? greenWaveTimer : (signalPhase === 0 || signalPhase === 1 ? phaseSecondsLeft : phaseSecondsLeft + 28),
      isWaveCorridor: true,
      detectionTag: 'car · 0.94'
    },
    {
      id: 'S',
      name: 'Approach South',
      corridor: 'Brigade Rd / MG Rd Junction',
      vehicles: 44,
      speed: '22 km/h',
      queue: '65m',
      laneCount: 3,
      camId: 'CAM-02-S-BRGD',
      fps: '25.0',
      bitrate: '3.6 Mb/s',
      signal: greenWaveActive ? 'green' : (signalPhase === 0 ? 'green' : signalPhase === 1 ? 'amber' : 'red'),
      countdown: greenWaveActive ? greenWaveTimer : (signalPhase === 0 || signalPhase === 1 ? phaseSecondsLeft : phaseSecondsLeft + 28),
      isWaveCorridor: true,
      detectionTag: 'bus · 0.96'
    },
    {
      id: 'E',
      name: 'Approach East',
      corridor: 'MG Road East (towards Trinity Circle)',
      vehicles: 52,
      speed: '34 km/h',
      queue: '28m',
      laneCount: 4,
      camId: 'CAM-03-E-TRNT',
      fps: '24.9',
      bitrate: '4.1 Mb/s',
      signal: greenWaveActive ? 'red' : (signalPhase === 2 ? 'green' : signalPhase === 3 ? 'amber' : 'red'),
      countdown: greenWaveActive ? greenWaveTimer : (signalPhase === 2 || signalPhase === 3 ? phaseSecondsLeft : phaseSecondsLeft + 32),
      isWaveCorridor: false,
      detectionTag: 'auto · 0.91'
    },
    {
      id: 'W',
      name: 'Approach West (Lane 4)',
      corridor: 'Church Street / Anil Kumble Jn',
      vehicles: 29,
      speed: '24 km/h',
      queue: '18m',
      laneCount: 2,
      camId: 'CAM-04-W-CHRC',
      fps: '25.0',
      bitrate: '3.4 Mb/s',
      signal: greenWaveActive ? 'green' : (signalPhase === 2 ? 'green' : signalPhase === 3 ? 'amber' : 'red'),
      countdown: greenWaveActive ? greenWaveTimer : (signalPhase === 2 || signalPhase === 3 ? phaseSecondsLeft : phaseSecondsLeft + 32),
      isWaveCorridor: true,
      hasAmbulance: true,
      detectionTag: 'AMBULANCE · 0.99 🚨'
    }
  ], [signalPhase, phaseSecondsLeft, greenWaveActive, greenWaveTimer]);

  // --- TRAFFIC FLOW 50-MINUTE HISTORY DATA (RECHARTS) ---
  const trafficHistory = useMemo(() => {
    const data = [];
    const baselineAvg = 38;
    const nowMinutes = 50;
    for (let i = 0; i <= nowMinutes; i += 2) {
      const minAgo = 50 - i;
      const curve = Math.sin((i / 50) * Math.PI * 2.2) * 12 + Math.cos((i / 25) * Math.PI) * 6;
      const noise = (Math.sin(i * 99) * 4);
      const val = Math.round(baselineAvg + curve + noise + (i > 35 ? 8 : 0));
      const base = Math.round(baselineAvg + Math.sin((i / 50) * Math.PI) * 4);
      const dev = Math.round(((val - base) / base) * 100);
      data.push({
        time: `-${minAgo}m`,
        vehicles: val,
        baseline: base,
        deviation: dev
      });
    }
    return data;
  }, []);

  // --- ANPR RECENT RED-LIGHT / STOP-LINE DETECTIONS ---
  const [anprReads, setAnprReads] = useState([
    { plate: 'KA 01 MJ 4821', type: 'Car (Sedan)', lane: 'Lane 2 · North', violation: 'Red-Light 0.4s', time: '12s ago', speed: '38 km/h', status: 'critical' },
    { plate: 'KA 04 EQ 9012', type: 'Commercial Van', lane: 'Lane 1 · West', violation: 'Stop Line +1.2m', time: '48s ago', speed: '24 km/h', status: 'warning' },
    { plate: 'KA 05 NB 1104', type: 'Auto-Rickshaw', lane: 'Lane 3 · South', violation: 'Yellow Entry 1.1s', time: '2m ago', speed: '29 km/h', status: 'warning' },
    { plate: 'KA 53 Z 8839', type: 'Car (SUV)', lane: 'Lane 2 · East', violation: 'Red-Light 1.8s', time: '3m ago', speed: '42 km/h', status: 'critical' },
    { plate: 'KA 03 HA 2029', type: 'Motorcycle', lane: 'Lane 1 · South', violation: 'Stop Line +0.8m', time: '5m ago', speed: '31 km/h', status: 'warning' },
  ]);

  // --- ALERTS STREAM ---
  const [alerts, setAlerts] = useState([
    { id: 'ALT-109', title: 'Stalled vehicle in Lane 2', location: 'MG Rd North approach', time: '1m ago', severity: 'amber', desc: 'Flow diverted to Lanes 1 & 3. Recovery crew alerted.' },
    { id: 'ALT-108', title: 'High pedestrian volume at crosswalk', location: 'Church St crossing', time: '4m ago', severity: 'amber', desc: 'Walk-phase extended by +6s dynamically.' },
    { id: 'ALT-107', title: 'Wrong-way detection cleared', location: 'Brigade Jn entry ramp', time: '8m ago', severity: 'green', desc: 'Vehicle reversed successfully; no bottleneck recorded.' },
    { id: 'ALT-106', title: 'HSV siren color signature detected', location: 'Approach East (Trinity corridor)', time: '14m ago', severity: 'red', desc: 'Emergency priority corridor deployed (cleared in 14.2s).' },
  ]);

  // --- 1. SIGNAL CYCLE INTERVAL ---
  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseSecondsLeft((prev) => {
        if (prev <= 1) {
          if (signalPhase === 0) {
            setSignalPhase(1); // N-S Amber
            return 4;
          } else if (signalPhase === 1) {
            setSignalPhase(2); // E-W Green
            return 28;
          } else if (signalPhase === 2) {
            setSignalPhase(3); // E-W Amber
            return 4;
          } else {
            setSignalPhase(0); // N-S Green
            return 28;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [signalPhase]);

  // --- 2. LIVE CLOCK TICK & OCCASIONAL ANPR LOGGING ---
  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Periodically simulate a new live plate read arriving
    const anprInterval = setInterval(() => {
      const samplePlates = ['KA 01 AB 7712', 'KA 03 MX 5541', 'KA 05 CD 3390', 'KA 51 F 1908', 'KA 04 N 6245'];
      const sampleTypes = ['Car (Sedan)', 'Auto-Rickshaw', 'Motorcycle', 'Commercial Bus', 'SUV'];
      const sampleLanes = ['Lane 1 · North', 'Lane 2 · South', 'Lane 3 · East', 'Lane 1 · West'];
      const sampleViolations = ['Stop Line +0.6m', 'Red-Light 0.3s', 'Speeding 52 km/h', 'Yellow Entry 0.9s'];

      const randomPlate = samplePlates[Math.floor(Math.random() * samplePlates.length)];
      const randomType = sampleTypes[Math.floor(Math.random() * sampleTypes.length)];
      const randomLane = sampleLanes[Math.floor(Math.random() * sampleLanes.length)];
      const randomViol = sampleViolations[Math.floor(Math.random() * sampleViolations.length)];
      const isCrit = randomViol.includes('Red-Light');

      setAnprReads((prev) => [
        {
          plate: randomPlate,
          type: randomType,
          lane: randomLane,
          violation: randomViol,
          time: 'Just now',
          speed: `${Math.floor(22 + Math.random() * 25)} km/h`,
          status: isCrit ? 'critical' : 'warning'
        },
        ...prev.slice(0, 5)
      ]);
    }, 9000);

    return () => {
      clearInterval(clock);
      clearInterval(anprInterval);
    };
  }, []);

  // --- 3. BOUNDING BOX DRIFT EFFECT (~2.4s interval) ---
  useEffect(() => {
    const driftInterval = setInterval(() => {
      setDriftOffsets([
        { x: (Math.random() - 0.5) * 18, y: (Math.random() - 0.5) * 14, confidence: +(0.91 + Math.random() * 0.07).toFixed(2), tag: 'car' },
        { x: (Math.random() - 0.5) * 16, y: (Math.random() - 0.5) * 12, confidence: +(0.88 + Math.random() * 0.08).toFixed(2), tag: 'auto' },
        { x: (Math.random() - 0.5) * 14, y: (Math.random() - 0.5) * 16, confidence: +(0.93 + Math.random() * 0.06).toFixed(2), tag: 'bus' },
        { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 10, confidence: +(0.98 + Math.random() * 0.02).toFixed(2), tag: 'ambulance', isAmbulance: true },
      ]);
      setLiveVehicleCount((prev) => Math.max(180, Math.min(320, prev + Math.floor(Math.random() * 5) - 2)));
    }, 2400);

    return () => clearInterval(driftInterval);
  }, []);

  // --- 4. VEHICLE PARTICLES SIMULATION ON SVG CANVAS ---
  useEffect(() => {
    const anim = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          let canMove = true;
          const isNSGreen = greenWaveActive || signalPhase === 0;
          const isEWGreen = !greenWaveActive && signalPhase === 2;

          if ((v.dir === 'N' || v.dir === 'S') && !isNSGreen && v.progress > 0.32 && v.progress < 0.42) {
            canMove = false;
          }
          if ((v.dir === 'E' || v.dir === 'W') && !isEWGreen && v.progress > 0.32 && v.progress < 0.42) {
            canMove = false;
          }

          if (!canMove) return v;

          let newProgress = v.progress + 0.015;
          if (newProgress >= 1) {
            newProgress = 0;
          }

          let currentX = v.x;
          let currentY = v.y;

          if (v.dir === 'N') {
            currentY = 40 + newProgress * 420;
          } else if (v.dir === 'S') {
            currentY = 440 - newProgress * 420;
          } else if (v.dir === 'W') {
            currentX = 40 + newProgress * 420;
          } else if (v.dir === 'E') {
            currentX = 460 - newProgress * 420;
          }

          return {
            ...v,
            progress: newProgress,
            x: currentX,
            y: currentY
          };
        })
      );
    }, 50);

    return () => clearInterval(anim);
  }, [signalPhase, greenWaveActive]);

  // --- 5. GREEN WAVE COUNTDOWN HANDLER ---
  useEffect(() => {
    let timer = null;
    if (greenWaveActive && greenWaveTimer > 0) {
      timer = setInterval(() => {
        setGreenWaveTimer((t) => {
          if (t <= 1) {
            setGreenWaveActive(false);
            setActiveAmbulances(0);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [greenWaveActive, greenWaveTimer]);

  const handleTriggerGreenWave = () => {
    if (greenWaveActive) {
      setGreenWaveActive(false);
      setGreenWaveTimer(0);
      setActiveAmbulances(0);
    } else {
      setGreenWaveActive(true);
      setGreenWaveTimer(35);
      setActiveAmbulances(1);
      setAlerts((prev) => [
        {
          id: `EMG-${Date.now().toString().slice(-4)}`,
          title: 'Manual Green Wave Triggered',
          location: 'MG Road North-South Arterial Corridor',
          time: 'Just now',
          severity: 'red',
          desc: 'All North-South signals held GREEN for 35s. East-West traffic halted.'
        },
        ...prev
      ]);
    }
  };

  const handleDismissAlert = (alertId) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  // Format formatted live clock
  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <div className="min-h-screen bg-[#151210] text-[#e7e5e4] selection:bg-[#D97706]/30 selection:text-white font-sans antialiased pb-12">
      {/* Inline styles for custom fonts and glow effects */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .font-fraunces { font-family: 'Fraunces', Georgia, serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .ambient-glow {
          box-shadow: 0 0 35px -10px rgba(217, 119, 6, 0.15);
        }
      `}</style>

      {/* Emergency Active Banner (When Green Wave is Live) */}
      {greenWaveActive && (
        <div className="bg-gradient-to-r from-red-900/90 via-amber-900/90 to-red-900/90 border-b border-amber-500/50 px-6 py-2.5 flex items-center justify-between text-xs animate-pulse sticky top-0 z-50 backdrop-blur-md shadow-lg shadow-amber-950/40">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="font-mono font-bold tracking-wider text-amber-200 uppercase">
              CRITICAL OVERRIDE: GREEN WAVE CORRIDOR ACTIVE (MG ROAD N-S)
            </span>
            <span className="hidden md:inline text-amber-300/80">
              · Ambulance Priority Clearance · Cross-traffic held at Red
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono font-bold">
            <span className="bg-black/40 px-2 py-0.5 rounded border border-amber-500/40 text-amber-400">
              {greenWaveTimer}s REMAINING
            </span>
            <button
              onClick={() => { setGreenWaveActive(false); setGreenWaveTimer(0); setActiveAmbulances(0); }}
              className="hover:underline text-stone-300 text-[11px]"
            >
              Cancel Override
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ========================================================= */}
        {/* 1. TOP HEADER SECTION */}
        {/* ========================================================= */}
        <header className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-5 md:p-6 ambient-glow">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            
            {/* Left Title & Civic Metadata */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#D97706] animate-pulse"></span>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#D97706] font-semibold">
                  City Ops · Bengaluru Central
                </span>
                <span className="text-stone-600 font-mono text-[10px]">|</span>
                <span className="text-stone-400 font-mono text-[11px] flex items-center gap-1">
                  <Radio size={12} className="text-emerald-500" /> RT-Telemetry Live
                </span>
                <span className="text-stone-600 font-mono text-[10px]">|</span>
                <span className="text-amber-400/90 font-mono text-[11px] font-semibold">
                  {formattedTime} IST
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-fraunces font-bold tracking-tight text-stone-100 flex items-center gap-3">
                Urban Pulse
                <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-[#242019] text-amber-400/90 border border-[#383028]">
                  Situation Room v2.4
                </span>
              </h1>

              <p className="text-stone-400 text-xs md:text-sm flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                <span className="font-semibold text-stone-200">MG Road / Church Street Intersection</span>
                <span className="text-stone-600">·</span>
                <span className="text-stone-400">Live since 06:00 IST</span>
                <span className="text-stone-600">·</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Signal Cycle Active (Phase {signalPhase + 1}/4)
                </span>
              </p>
            </div>

            {/* Right Quick Telemetry Badges & Primary CTA */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Vehicle Count Badge */}
              <div className="bg-[#242019] border border-[#2d261e] rounded-lg px-3.5 py-2 flex items-center gap-3 min-w-[130px]">
                <div className="p-2 rounded-md bg-[#1b1815] text-[#D97706] border border-[#383028]">
                  <Car size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Live Vehicles</div>
                  <div className="text-lg font-bold font-mono text-stone-100 flex items-center gap-1">
                    {liveVehicleCount}
                    <span className="text-[10px] text-emerald-400 font-normal">active</span>
                  </div>
                </div>
              </div>

              {/* Active Ambulance Badge */}
              <div className={`border rounded-lg px-3.5 py-2 flex items-center gap-3 min-w-[130px] transition-all ${
                activeAmbulances > 0
                  ? 'bg-red-950/40 border-red-500/50 shadow-md shadow-red-900/20'
                  : 'bg-[#242019] border-[#2d261e]'
              }`}>
                <div className={`p-2 rounded-md border ${
                  activeAmbulances > 0
                    ? 'bg-red-900/50 text-red-400 border-red-500/50 animate-bounce'
                    : 'bg-[#1b1815] text-stone-400 border-[#383028]'
                }`}>
                  <Siren size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">Ambulance</div>
                  <div className={`text-lg font-bold font-mono ${activeAmbulances > 0 ? 'text-red-400' : 'text-stone-100'}`}>
                    {activeAmbulances} <span className="text-[10px] text-stone-400 font-normal">{activeAmbulances > 0 ? 'in corridor' : 'detected'}</span>
                  </div>
                </div>
              </div>

              {/* Prominent Amber "Trigger Green Wave" CTA Button */}
              <button
                onClick={handleTriggerGreenWave}
                className={`relative group px-4 py-2.5 rounded-lg font-semibold text-xs md:text-sm transition-all duration-200 flex items-center gap-2.5 shadow-lg ${
                  greenWaveActive
                    ? 'bg-red-600 hover:bg-red-700 text-white border border-red-400 shadow-red-900/40'
                    : 'bg-gradient-to-r from-[#D97706] to-[#B45309] hover:from-[#F59E0B] hover:to-[#D97706] text-stone-950 font-bold border border-amber-400/40 shadow-amber-950/40'
                }`}
                title="Override all traffic signals for emergency corridor clearance"
              >
                <Zap size={16} className={greenWaveActive ? 'animate-spin' : 'text-stone-950 group-hover:scale-110 transition-transform'} />
                <span>{greenWaveActive ? 'Halt Green Wave' : 'Trigger Green Wave'}</span>
                {!greenWaveActive && (
                  <span className="hidden sm:inline-block bg-stone-950/20 text-stone-950 text-[10px] font-mono px-1.5 py-0.5 rounded ml-1">
                    CORRIDOR
                  </span>
                )}
              </button>
            </div>

          </div>
        </header>

        {/* ========================================================= */}
        {/* 2. LIVE LANE DETECTION STRIP (4 CAMERA FEEDS WITH REAL-WORLD VIDEO) */}
        {/* ========================================================= */}
        <section className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-300">
              <Camera size={14} className="text-[#D97706]" />
              <span className="uppercase font-mono tracking-wider text-[11px] text-stone-300">
                Live Lane Ingestion · 4 Approaches (Real-World RTSP Feeds)
              </span>
            </div>
            
            {/* Real Video Mode Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-[#1b1815] border border-[#2d261e] p-0.5 rounded-lg text-[10px] font-mono">
                <button
                  onClick={() => setFeedMode('optical')}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    feedMode === 'optical'
                      ? 'bg-[#D97706] text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Optical Feed
                </button>
                <button
                  onClick={() => setFeedMode('thermal')}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    feedMode === 'thermal'
                      ? 'bg-amber-600 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  AI Thermal Mode
                </button>
              </div>

              <span className="text-[11px] font-mono text-stone-500 hidden md:inline">
                YOLOv8 Inference @ 25 FPS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {approaches.map((appr, idx) => {
              const drift = driftOffsets[idx] || { x: 0, y: 0, confidence: 0.92, tag: 'car' };
              const isSignalGreen = appr.signal === 'green';
              const isSignalAmber = appr.signal === 'amber';

              return (
                <div
                  key={appr.id}
                  onClick={() => setSelectedApproach(selectedApproach === appr.id ? 'all' : appr.id)}
                  className={`bg-[#1b1815] border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer group ${
                    appr.hasAmbulance || idx === 3
                      ? 'border-red-500/80 shadow-lg shadow-red-950/40 ring-1 ring-red-500/40'
                      : selectedApproach === appr.id
                      ? 'border-amber-500 shadow-md shadow-amber-950/30'
                      : 'border-[#2d261e] hover:border-amber-600/50'
                  }`}
                >
                  {/* Top Feed Header */}
                  <div className="p-3 bg-[#242019]/60 border-b border-[#2d261e] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-stone-200 flex items-center gap-1.5">
                        {(appr.hasAmbulance || idx === 3) && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                        <span>{appr.id} · {appr.name}</span>
                      </span>
                    </div>
                    {/* Signal Status Pill */}
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#151210] border border-[#383028]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isSignalGreen
                            ? 'bg-[#16A34A] glow-green'
                            : isSignalAmber
                            ? 'bg-[#D97706] glow-amber'
                            : 'bg-[#DC2626] glow-red'
                        }`}
                      ></span>
                      <span className="font-mono text-[10px] uppercase font-bold text-stone-300">
                        {appr.signal} ({appr.countdown}s)
                      </span>
                    </div>
                  </div>

                  {/* Real-World Video Feed Screen with drifting YOLOv8 Bounding Box */}
                  <div className="relative h-48 bg-black p-3 overflow-hidden flex flex-col justify-between select-none">
                    
                    {/* Embedded Real-World HTML5 Video Player */}
                    <div className="absolute inset-0 overflow-hidden bg-stone-950">
                      <video
                        src={customVideoUrl || "/sample_traffic.mp4"}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover transition-all duration-500"
                        style={{
                          transform: idx === 1 ? 'scaleX(-1)' : idx === 2 ? 'scale(1.1) translate(-2%, -2%)' : idx === 3 ? 'scale(1.15) translate(2%, 2%)' : 'none',
                          filter: feedMode === 'thermal'
                            ? 'contrast(1.5) brightness(0.85) hue-rotate(190deg) saturate(2.5)'
                            : idx === 3
                            ? 'contrast(1.18) brightness(0.88) saturate(1.15)'
                            : 'contrast(1.12) brightness(0.85) saturate(1.1)'
                        }}
                      />
                      {/* Dark gradient vignettes for legible telemetry */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
                      {/* Subtle CCTV grid / scanline effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
                    </div>

                    {/* RTSP Live Badge & Telemetry */}
                    <div className="flex items-center justify-between z-10">
                      <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-sm border border-stone-800 px-2 py-0.5 rounded text-[10px] font-mono text-stone-300 shadow">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="font-bold text-red-400">LIVE RTSP</span>
                        <span className="text-stone-500">|</span>
                        <span>{appr.camId}</span>
                      </div>
                      <div className="text-[9px] font-mono text-stone-300 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded border border-stone-800 shadow">
                        {appr.fps} FPS · {appr.bitrate}
                      </div>
                    </div>

                    {/* Top Emergency Banner on 4th Lane */}
                    {idx === 3 && (
                      <div className="absolute top-9 left-2 right-2 z-20 bg-red-950/85 backdrop-blur-sm border border-red-500/80 text-red-200 px-2 py-0.5 rounded text-[9px] font-mono font-bold flex items-center justify-between shadow-md animate-pulse">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                          <span>🚨 AMBULANCE DETECTED IN LANE 4</span>
                        </div>
                        <span className="text-amber-300 bg-black/60 px-1 py-0.2 rounded text-[8px] border border-amber-500/40">
                          PRIORITY 1
                        </span>
                      </div>
                    )}

                    {/* Animated Drifting Bounding Box (YOLOv8 Live Inference Simulation) */}
                    {idx === 3 || drift.isAmbulance ? (
                      /* AMBULANCE BOUNDING BOX (LANE 4) */
                      <div
                        className="absolute z-20 transition-all duration-1000 ease-out pointer-events-none"
                        style={{
                          top: `calc(38% + ${drift.y}px)`,
                          left: `calc(28% + ${drift.x}px)`,
                          width: '115px',
                          height: '62px',
                        }}
                      >
                        <div className="w-full h-full border-2 border-red-500 bg-red-600/25 rounded-md relative shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-pulse">
                          {/* Corner Emergency Brackets */}
                          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-red-400"></div>
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-red-400"></div>
                          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-red-400"></div>
                          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-red-400"></div>

                          {/* Dual Red/Blue Flashing Siren Lightbar on Vehicle Roof */}
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/90 px-2 py-0.5 rounded-full border border-red-500 shadow-md">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                            <span className="text-[9px] font-mono font-bold text-red-300 whitespace-nowrap">
                              AMBULANCE · 0.99
                            </span>
                            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                          </div>

                          {/* Center Siren Status Pill */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-red-700/90 text-white font-bold text-[8px] font-mono px-1.5 py-0.5 rounded border border-red-300/40 flex items-center gap-1 shadow-lg">
                              <Siren size={10} className="animate-spin text-red-200" />
                              <span>HSV SIREN DETECTED</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Standard Vehicle Bounding Box */
                      <div
                        className="absolute z-20 transition-all duration-1000 ease-out pointer-events-none"
                        style={{
                          top: `calc(40% + ${drift.y}px)`,
                          left: `calc(32% + ${drift.x}px)`,
                          width: '88px',
                          height: '48px',
                        }}
                      >
                        <div className="w-full h-full border-2 border-amber-400 bg-amber-500/15 rounded-sm relative shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-amber-400"></div>
                          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-amber-400"></div>
                          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-amber-400"></div>
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-amber-400"></div>

                          <div className="absolute -top-4 left-0 bg-amber-500 text-stone-950 text-[9px] font-mono font-bold px-1 rounded-t-sm whitespace-nowrap shadow-sm">
                            {drift.tag} · {drift.confidence}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Secondary Ghost Bounding Box */}
                    <div
                      className="absolute z-10 transition-all duration-1000 ease-out opacity-75 pointer-events-none"
                      style={{
                        top: `calc(20% - ${drift.y * 0.4}px)`,
                        left: `calc(58% - ${drift.x * 0.4}px)`,
                        width: '54px',
                        height: '32px',
                      }}
                    >
                      <div className="w-full h-full border border-emerald-400 bg-emerald-500/15 rounded-sm relative">
                        <div className="absolute -top-3.5 left-0 bg-emerald-600 text-white text-[8px] font-mono px-1 rounded-t-sm">
                          car · 0.88
                        </div>
                      </div>
                    </div>

                    {/* Bottom Feed Overlay Stats */}
                    <div className="flex items-center justify-between z-10 pt-2">
                      <div className="bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded border border-stone-800 font-mono text-[10px] text-stone-200 shadow">
                        Vehicles: <span className="font-bold text-amber-400">{appr.vehicles}</span>
                      </div>
                      <div className="bg-black/75 backdrop-blur-sm px-2 py-0.5 rounded border border-stone-800 font-mono text-[10px] text-stone-200 shadow">
                        {isSignalGreen ? (
                          <span className="text-emerald-400 font-bold">Green: {appr.countdown}s</span>
                        ) : (
                          <span className="text-stone-300 font-bold">Wait: {appr.countdown}s</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="p-2.5 bg-[#1b1815] border-t border-[#2d261e] text-[11px] flex items-center justify-between text-stone-400 font-mono">
                    <span className="truncate max-w-[140px] text-stone-400" title={appr.corridor}>
                      {appr.corridor}
                    </span>
                    <span className="text-amber-400 font-semibold">{appr.speed}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. TWO-COLUMN MAIN BODY */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ------------------------------------------------------- */}
          {/* LEFT COLUMN (WIDER ~7 COLS): HERO INTERSECTION MAP + AREA CHART + LANE LIST */}
          {/* ------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-6">

            {/* A) INTERSECTION MAP - VISUAL HERO */}
            <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-4 sm:p-5 ambient-glow relative overflow-hidden">
              
              {/* Map Header Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-3 border-b border-[#2d261e]">
                <div>
                  <div className="flex items-center gap-2">
                    <Compass size={16} className="text-[#D97706]" />
                    <h2 className="font-fraunces text-lg font-bold text-stone-100">
                      Live Intersection Matrix · Aerial Geometry
                    </h2>
                  </div>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Real-time vehicle particle trajectories & phase-coordinated signal heads
                  </p>
                </div>

                {/* Interactive Approach Selector Pill */}
                <div className="flex items-center gap-1 bg-[#151210] p-1 rounded-lg border border-[#2d261e] text-[11px] font-mono">
                  {['all', 'N', 'S', 'E', 'W'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedApproach(opt)}
                      className={`px-2 py-1 rounded font-bold uppercase transition ${
                        selectedApproach === opt
                          ? 'bg-[#D97706] text-stone-950 shadow'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {opt === 'all' ? 'All Lanes' : opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Map Legend Overlay */}
              <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-stone-400 mb-2 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#16A34A] glow-green"></span> Green Phase (Free Flow)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#DC2626] glow-red"></span> Red Phase (Holding)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#D97706] glow-amber"></span> Amber Transition
                </span>
                {greenWaveActive && (
                  <span className="flex items-center gap-1.5 text-amber-300 font-bold animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-amber-400"></span> Green Wave Corridor
                  </span>
                )}
              </div>

              {/* Interactive SVG Hero Map Container */}
              <div className="relative w-full aspect-square max-h-[500px] bg-[#120f0d] rounded-lg border border-[#242019] overflow-hidden flex items-center justify-center p-2">
                
                {/* SVG Visual Hero */}
                <svg
                  viewBox="0 0 500 500"
                  className="w-full h-full select-none"
                >
                  <defs>
                    <linearGradient id="waveCorridorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#16a34a" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
                    </linearGradient>

                    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* 1. Background City Block Ground */}
                  <rect x="0" y="0" width="500" height="500" fill="#151210" />

                  {/* 2. Civic Building / Sidewalk Corners */}
                  <rect x="15" y="15" width="180" height="180" rx="8" fill="#1d1915" stroke="#2d261e" strokeWidth="2" />
                  <text x="30" y="40" fill="#78716c" fontSize="10" fontFamily="Inter" fontWeight="600">MG ROAD NORTH-WEST</text>
                  <text x="30" y="55" fill="#57534e" fontSize="8" fontFamily="JetBrains Mono">ZONE A · PEDESTRIAN PLAZA</text>

                  <rect x="305" y="15" width="180" height="180" rx="8" fill="#1d1915" stroke="#2d261e" strokeWidth="2" />
                  <text x="320" y="40" fill="#78716c" fontSize="10" fontFamily="Inter" fontWeight="600">NORTH-EAST PRECINCT</text>
                  <text x="320" y="55" fill="#57534e" fontSize="8" fontFamily="JetBrains Mono">ZONE B · METRO CONCOURSE</text>

                  <rect x="15" y="305" width="180" height="180" rx="8" fill="#1d1915" stroke="#2d261e" strokeWidth="2" />
                  <text x="30" y="330" fill="#78716c" fontSize="10" fontFamily="Inter" fontWeight="600">CHURCH STREET CORRIDOR</text>
                  <text x="30" y="345" fill="#57534e" fontSize="8" fontFamily="JetBrains Mono">ZONE C · COMMERCIAL</text>

                  <rect x="305" y="305" width="180" height="180" rx="8" fill="#1d1915" stroke="#2d261e" strokeWidth="2" />
                  <text x="320" y="330" fill="#78716c" fontSize="10" fontFamily="Inter" fontWeight="600">BRIGADE ROAD ENTRY</text>
                  <text x="320" y="345" fill="#57534e" fontSize="8" fontFamily="JetBrains Mono">ZONE D · RETAIL GRID</text>

                  {/* 3. Road Corridors (Tarmac) */}
                  <rect x="195" y="0" width="110" height="500" fill="#201b17" />
                  <rect x="0" y="195" width="500" height="110" fill="#201b17" />
                  <rect x="195" y="195" width="110" height="110" fill="#26201b" />

                  {/* Emergency Green Wave corridor highlight overlay if active */}
                  {greenWaveActive && (
                    <rect
                      x="195"
                      y="0"
                      width="110"
                      height="500"
                      fill="url(#waveCorridorGlow)"
                      className="animate-pulse"
                    />
                  )}

                  {/* 4. Road Markings & Lane Dividers */}
                  <line x1="248" y1="0" x2="248" y2="185" stroke="#d97706" strokeWidth="2" />
                  <line x1="252" y1="0" x2="252" y2="185" stroke="#d97706" strokeWidth="2" />
                  <line x1="248" y1="315" x2="248" y2="500" stroke="#d97706" strokeWidth="2" />
                  <line x1="252" y1="315" x2="252" y2="500" stroke="#d97706" strokeWidth="2" />

                  <line x1="222" y1="0" x2="222" y2="185" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />
                  <line x1="278" y1="0" x2="278" y2="185" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />
                  <line x1="222" y1="315" x2="222" y2="500" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />
                  <line x1="278" y1="315" x2="278" y2="500" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />

                  <line x1="0" y1="248" x2="185" y2="248" stroke="#d97706" strokeWidth="2" />
                  <line x1="0" y1="252" x2="185" y2="252" stroke="#d97706" strokeWidth="2" />
                  <line x1="315" y1="248" x2="500" y2="248" stroke="#d97706" strokeWidth="2" />
                  <line x1="315" y1="252" x2="500" y2="252" stroke="#d97706" strokeWidth="2" />

                  <line x1="0" y1="222" x2="185" y2="222" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />
                  <line x1="0" y1="278" x2="185" y2="278" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />
                  <line x1="315" y1="222" x2="500" y2="222" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />
                  <line x1="315" y1="278" x2="500" y2="278" stroke="#78716c" strokeWidth="1.5" strokeDasharray="8,8" />

                  {/* 5. Solid White Stop Lines */}
                  <line x1="195" y1="185" x2="305" y2="185" stroke="#e5e7eb" strokeWidth="3" />
                  <line x1="195" y1="315" x2="305" y2="315" stroke="#e5e7eb" strokeWidth="3" />
                  <line x1="185" y1="195" x2="185" y2="305" stroke="#e5e7eb" strokeWidth="3" />
                  <line x1="315" y1="195" x2="315" y2="305" stroke="#e5e7eb" strokeWidth="3" />

                  {/* 6. Pedestrian Zebra Crossings */}
                  {[...Array(9)].map((_, i) => (
                    <rect key={`n-cross-${i}`} x={198 + i * 12} y="166" width="7" height="15" fill="#d6d3d1" opacity="0.85" />
                  ))}
                  {[...Array(9)].map((_, i) => (
                    <rect key={`s-cross-${i}`} x={198 + i * 12} y="319" width="7" height="15" fill="#d6d3d1" opacity="0.85" />
                  ))}
                  {[...Array(9)].map((_, i) => (
                    <rect key={`w-cross-${i}`} x="166" y={198 + i * 12} width="15" height="7" fill="#d6d3d1" opacity="0.85" />
                  ))}
                  {[...Array(9)].map((_, i) => (
                    <rect key={`e-cross-${i}`} x="319" y={198 + i * 12} width="15" height="7" fill="#d6d3d1" opacity="0.85" />
                  ))}

                  {/* 7. Center Yellow Box Junction Grid */}
                  <g opacity="0.4">
                    <rect x="210" y="210" width="80" height="80" fill="none" stroke="#eab308" strokeWidth="1.5" />
                    <line x1="210" y1="210" x2="290" y2="290" stroke="#eab308" strokeWidth="1" strokeDasharray="4,4" />
                    <line x1="290" y1="210" x2="210" y2="290" stroke="#eab308" strokeWidth="1" strokeDasharray="4,4" />
                  </g>

                  {/* 8. Moving Vehicle Particles */}
                  {vehicles.map((v) => (
                    <g key={v.id} transform={`translate(${v.x}, ${v.y})`}>
                      {v.type === 'ambulance' ? (
                        <g>
                          {/* Pulsing Red Emergency Beacon Halo */}
                          <circle r="14" fill="#ef4444" opacity="0.4" className="animate-ping" />
                          <circle r="9" fill="#ef4444" opacity="0.6" filter="url(#glowEffect)" />
                          {/* White Chassis with Red Cross */}
                          <rect x="-8" y="-5" width="16" height="10" rx="2" fill="#ffffff" stroke="#ef4444" strokeWidth="1.5" />
                          <rect x="-5" y="-1" width="10" height="2" fill="#ef4444" />
                          <rect x="-1" y="-4" width="2" height="8" fill="#ef4444" />
                          {/* Red/Blue Strobe LEDs */}
                          <circle cx="-3" cy="-3" r="1.5" fill="#ef4444" />
                          <circle cx="3" cy="-3" r="1.5" fill="#3b82f6" />
                        </g>
                      ) : (
                        <circle
                          r={v.type === 'bus' ? 7 : v.type === 'auto' ? 4 : 5.5}
                          fill={v.color}
                          stroke="#151210"
                          strokeWidth="1.5"
                          filter="url(#glowEffect)"
                        />
                      )}
                      <circle r="2" fill="#fffbeb" opacity="0.9" />
                    </g>
                  ))}

                  {/* 9. Animated Signal Heads (4 Corners) */}
                  {/* North Signal Head */}
                  {(() => {
                    const sig = greenWaveActive ? 'green' : (signalPhase === 0 ? 'green' : signalPhase === 1 ? 'amber' : 'red');
                    return (
                      <g transform="translate(170, 150)">
                        <rect x="0" y="0" width="18" height="34" rx="4" fill="#151210" stroke="#443a2f" strokeWidth="1.5" />
                        <circle cx="9" cy="9" r="4" fill={sig === 'red' ? '#DC2626' : '#382020'} filter={sig === 'red' ? 'url(#glowEffect)' : ''} />
                        <circle cx="9" cy="17" r="4" fill={sig === 'amber' ? '#D97706' : '#382b15'} filter={sig === 'amber' ? 'url(#glowEffect)' : ''} />
                        <circle cx="9" cy="25" r="4" fill={sig === 'green' ? '#16A34A' : '#15301e'} filter={sig === 'green' ? 'url(#glowEffect)' : ''} />
                        <text x="-40" y="18" fill="#e7e5e4" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">N-LANE</text>
                      </g>
                    );
                  })()}

                  {/* South Signal Head */}
                  {(() => {
                    const sig = greenWaveActive ? 'green' : (signalPhase === 0 ? 'green' : signalPhase === 1 ? 'amber' : 'red');
                    return (
                      <g transform="translate(315, 315)">
                        <rect x="0" y="0" width="18" height="34" rx="4" fill="#151210" stroke="#443a2f" strokeWidth="1.5" />
                        <circle cx="9" cy="9" r="4" fill={sig === 'red' ? '#DC2626' : '#382020'} filter={sig === 'red' ? 'url(#glowEffect)' : ''} />
                        <circle cx="9" cy="17" r="4" fill={sig === 'amber' ? '#D97706' : '#382b15'} filter={sig === 'amber' ? 'url(#glowEffect)' : ''} />
                        <circle cx="9" cy="25" r="4" fill={sig === 'green' ? '#16A34A' : '#15301e'} filter={sig === 'green' ? 'url(#glowEffect)' : ''} />
                        <text x="25" y="20" fill="#e7e5e4" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">S-LANE</text>
                      </g>
                    );
                  })()}

                  {/* West Signal Head */}
                  {(() => {
                    const sig = greenWaveActive ? 'red' : (signalPhase === 2 ? 'green' : signalPhase === 3 ? 'amber' : 'red');
                    return (
                      <g transform="translate(150, 315)">
                        <rect x="0" y="0" width="34" height="18" rx="4" fill="#151210" stroke="#443a2f" strokeWidth="1.5" />
                        <circle cx="9" cy="9" r="4" fill={sig === 'red' ? '#DC2626' : '#382020'} filter={sig === 'red' ? 'url(#glowEffect)' : ''} />
                        <circle cx="17" cy="9" r="4" fill={sig === 'amber' ? '#D97706' : '#382b15'} filter={sig === 'amber' ? 'url(#glowEffect)' : ''} />
                        <circle cx="25" cy="9" r="4" fill={sig === 'green' ? '#16A34A' : '#15301e'} filter={sig === 'green' ? 'url(#glowEffect)' : ''} />
                        <text x="-40" y="14" fill="#e7e5e4" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">W-LANE</text>
                      </g>
                    );
                  })()}

                  {/* East Signal Head */}
                  {(() => {
                    const sig = greenWaveActive ? 'red' : (signalPhase === 2 ? 'green' : signalPhase === 3 ? 'amber' : 'red');
                    return (
                      <g transform="translate(315, 168)">
                        <rect x="0" y="0" width="34" height="18" rx="4" fill="#151210" stroke="#443a2f" strokeWidth="1.5" />
                        <circle cx="9" cy="9" r="4" fill={sig === 'red' ? '#DC2626' : '#382020'} filter={sig === 'red' ? 'url(#glowEffect)' : ''} />
                        <circle cx="17" cy="9" r="4" fill={sig === 'amber' ? '#D97706' : '#382b15'} filter={sig === 'amber' ? 'url(#glowEffect)' : ''} />
                        <circle cx="25" cy="9" r="4" fill={sig === 'green' ? '#16A34A' : '#15301e'} filter={sig === 'green' ? 'url(#glowEffect)' : ''} />
                        <text x="40" y="14" fill="#e7e5e4" fontSize="9" fontFamily="JetBrains Mono" fontWeight="bold">E-LANE</text>
                      </g>
                    );
                  })()}

                  {/* Directional Compass Needle In Top Corner */}
                  <g transform="translate(460, 40)">
                    <circle r="16" fill="#1b1815" stroke="#383028" strokeWidth="1.5" />
                    <polygon points="0,-12 4,0 -4,0" fill="#dc2626" />
                    <polygon points="0,12 4,0 -4,0" fill="#78716c" />
                    <text x="-3.5" y="-14" fill="#dc2626" fontSize="7" fontFamily="JetBrains Mono" fontWeight="bold">N</text>
                  </g>
                </svg>

                {/* SVG Active Telemetry Floating Chip */}
                <div className="absolute bottom-3 left-3 bg-[#1b1815]/90 backdrop-blur-md border border-[#383028] px-3 py-1.5 rounded-md text-[10px] font-mono text-stone-300 flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="font-bold text-emerald-400">Phase {signalPhase + 1} of 4</span>
                  </span>
                  <span className="text-stone-600">|</span>
                  <span>Cycle Duration: 64s</span>
                </div>
              </div>
            </div>

            {/* B) AREA CHART: TRAFFIC FLOW OVER LAST 50 MINUTES */}
            <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-5 ambient-glow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#D97706]" />
                    <h3 className="font-fraunces text-base font-bold text-stone-100">
                      Corridor Traffic Volume · 50-Minute Rolling Timeline
                    </h3>
                  </div>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Continuous vehicle throughput compared against historical 30-day baseline
                  </p>
                </div>

                {/* "% Above Average" Badge */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-[#D97706] px-2.5 py-1 rounded-full text-xs font-mono font-bold">
                    <ArrowUpRight size={14} />
                    +14.2% above average
                  </span>
                  <span className="text-[11px] font-mono text-stone-400 bg-[#242019] px-2 py-1 rounded border border-[#2d261e]">
                    Peak: 58 v/m
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="warmAmberArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="baselineStroke" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#78716c" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#78716c" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      stroke="#57534e"
                      fontSize={10}
                      tickLine={false}
                      fontFamily="JetBrains Mono"
                    />
                    <YAxis
                      stroke="#57534e"
                      fontSize={10}
                      tickLine={false}
                      fontFamily="JetBrains Mono"
                      domain={[15, 65]}
                    />
                    <Tooltip content={<CustomTrafficTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="baseline"
                      stroke="#78716c"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={0.1}
                      fill="url(#baselineStroke)"
                      name="30-Day Baseline"
                    />
                    <Area
                      type="monotone"
                      dataKey="vehicles"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#warmAmberArea)"
                      name="Active Flow"
                      activeDot={{ r: 5, fill: '#F59E0B', stroke: '#151210', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-stone-400 pt-3 border-t border-[#2d261e] mt-2">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-4 bg-[#F59E0B] rounded-sm"></span> Current Flow (veh/min)
                  <span className="h-2 w-4 bg-[#78716c] opacity-50 rounded-sm ml-2"></span> 30-Day Mean Baseline
                </span>
                <span className="text-stone-300">Throughput: 1,842 veh/hr</span>
              </div>
            </div>

            {/* C) COMPACT LIST VIEW OF ALL 4 LANES */}
            <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-5 ambient-glow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-fraunces text-base font-bold text-stone-100">
                  Approach Summary Telemetry
                </h3>
                <span className="text-stone-400 text-xs font-mono">4 Approaches Configured</span>
              </div>

              <div className="space-y-2.5">
                {approaches.map((appr) => {
                  const isSignalGreen = appr.signal === 'green';
                  const isSignalAmber = appr.signal === 'amber';

                  return (
                    <div
                      key={appr.id}
                      className="p-3 bg-[#242019]/60 border border-[#2d261e] hover:border-[#383028] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full flex-shrink-0 ${
                            isSignalGreen
                              ? 'bg-[#16A34A] glow-green'
                              : isSignalAmber
                              ? 'bg-[#D97706] glow-amber'
                              : 'bg-[#DC2626] glow-red'
                          }`}
                        ></span>
                        <div>
                          <div className="font-semibold text-xs text-stone-200 flex items-center gap-2">
                            <span>{appr.name}</span>
                            <span className="text-stone-500 font-normal">|</span>
                            <span className="text-stone-400 font-mono text-[11px]">{appr.corridor}</span>
                          </div>
                          <div className="text-[11px] text-stone-400 font-mono flex items-center gap-3 mt-0.5">
                            <span>Queue: {appr.queue}</span>
                            <span>·</span>
                            <span>Speed: {appr.speed}</span>
                            <span>·</span>
                            <span>Lanes: {appr.laneCount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto font-mono text-xs">
                        <div className="text-right">
                          <div className="text-stone-400 text-[10px]">VEHICLES</div>
                          <div className="font-bold text-stone-100">{appr.vehicles}</div>
                        </div>
                        <div className="min-w-[85px] text-right">
                          <div className="text-stone-400 text-[10px]">SIGNAL TIMER</div>
                          <div className={`font-bold ${isSignalGreen ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isSignalGreen ? `Green ${appr.countdown}s` : `Wait ${appr.countdown}s`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT COLUMN (NARROWER ~5 COLS): ALERTS + 2x2 STATS + ANPR + CAPTION */}
          {/* ------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-6">

            {/* 1. ALERTS PANEL */}
            <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-5 ambient-glow">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2d261e]">
                <div className="flex items-center gap-2">
                  <AlertOctagon size={16} className="text-[#D97706]" />
                  <h3 className="font-fraunces text-base font-bold text-stone-100">
                    Civic Incident Stream
                  </h3>
                </div>
                <span className="bg-[#242019] text-[#D97706] border border-[#383028] px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  {alerts.length} ACTIVE
                </span>
              </div>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 bg-[#242019]/70 border border-[#2d261e] rounded-lg space-y-1.5 transition hover:border-[#383028]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                            alt.severity === 'red'
                              ? 'bg-[#DC2626] glow-red animate-pulse'
                              : alt.severity === 'amber'
                              ? 'bg-[#D97706] glow-amber'
                              : 'bg-[#16A34A] glow-green'
                          }`}
                        ></span>
                        <span className="font-semibold text-xs text-stone-200">
                          {alt.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-stone-400 flex-shrink-0">
                        {alt.time}
                      </span>
                    </div>

                    <p className="text-[11px] text-stone-400 pl-4 leading-relaxed">
                      {alt.desc}
                    </p>

                    <div className="flex items-center justify-between pl-4 pt-1 text-[10px] font-mono text-stone-400">
                      <span>{alt.location}</span>
                      <button
                        onClick={() => handleDismissAlert(alt.id)}
                        className="text-stone-400 hover:text-amber-400 underline"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. 2x2 STAT GRID */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Pedestrians Waiting */}
              <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-4 ambient-glow flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Pedestrians Waiting</span>
                  <Users size={15} className="text-amber-400" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold font-mono text-stone-100">42</div>
                  <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1 font-mono">
                    <span className="text-emerald-400 font-bold">+6s</span> walk cycle applied
                  </div>
                </div>
              </div>

              {/* Corridor Density */}
              <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-4 ambient-glow flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Corridor Density</span>
                  <Activity size={15} className="text-[#D97706]" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold font-mono text-[#D97706]">78%</div>
                  <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Moderate-Heavy flow
                  </div>
                </div>
              </div>

              {/* Avg Wait Time */}
              <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-4 ambient-glow flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Avg Wait Time</span>
                  <Clock size={15} className="text-emerald-400" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold font-mono text-stone-100">48s</div>
                  <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1 font-mono">
                    <span>-14s vs fixed cycle</span>
                  </div>
                </div>
              </div>

              {/* Emergency Overrides Today */}
              <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-4 ambient-glow flex flex-col justify-between">
                <div className="flex items-center justify-between text-stone-400">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Emergency Clearances</span>
                  <Siren size={15} className="text-red-400" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold font-mono text-red-400">6</div>
                  <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
                    100% corridor success rate
                  </div>
                </div>
              </div>
            </div>

            {/* 3. ANPR "PLATE READS — RED-LIGHT" LIST */}
            <div className="bg-[#1b1815] border border-[#2d261e] rounded-xl p-5 ambient-glow">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2d261e]">
                <div>
                  <div className="flex items-center gap-2">
                    <Car size={16} className="text-[#D97706]" />
                    <h3 className="font-fraunces text-base font-bold text-stone-100">
                      ANPR Plate Reads · Red-Light & Stop Line
                    </h3>
                  </div>
                  <p className="text-stone-400 text-xs mt-0.5">
                    Automated OCR license plate capture via optical trigger
                  </p>
                </div>
                <span className="text-[10px] font-mono text-stone-500">Auto-Logged</span>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {anprReads.map((read, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-[#242019]/60 border border-[#2d261e] rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300 bg-[#151210] px-2 py-0.5 rounded border border-[#383028] tracking-wider text-xs">
                          {read.plate}
                        </span>
                        <span className="text-stone-400 text-[10px] font-mono">{read.type}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {read.lane} · {read.speed}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          read.status === 'critical'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {read.violation}
                      </span>
                      <div className="text-[9px] font-mono text-stone-400 mt-0.5">{read.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. CLOSING SYSTEM CAPTION FOOTER */}
            <div className="bg-[#1b1815]/90 border border-[#2d261e] rounded-xl p-4 text-xs text-stone-400 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold font-mono text-[11px]">
                <Shield size={14} />
                <span>Civic Situation Room Architecture · Bengaluru Central Grid</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed font-sans">
                The Urban Pulse command center operates live YOLOv8 vehicle and queue density detection combined with HSV-based siren chrominance detection. All telemetry events, ANPR plate infractions, and adaptive signal phase transitions are committed to TimescaleDB with 50ms time-series ingestion.
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 pt-2 border-t border-[#2d261e]">
                <span>Host: in-blr-central-01</span>
                <span>TimescaleDB Status: Synchronized</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
