import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import VideoLaneCard from '../components/VideoLaneCard';
import TrafficAnalytics from '../components/TrafficAnalytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [laneData, setLaneData] = useState({
    lane1: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null },
    lane2: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null },
    lane3: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null },
    lane4: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null }
  });

  const [isProcessing, setIsProcessing] = useState({});
  const [uploadedVideos, setUploadedVideos] = useState({});
  const videoRefs = useRef({});
  const canvasRefs = useRef({});
  const processingIntervals = useRef({});
  const frameInFlight = useRef({});
  const systemGeneration = useRef(0);
  const prevAmbulanceState = useRef({});

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/traffic-state`);
        setLaneData(prevData => {
          const newData = { ...prevData };
          Object.keys(response.data).forEach(laneId => {
            newData[laneId] = {
              ...newData[laneId],
              ...response.data[laneId]
            };
          });
          return newData;
        });
      } catch (error) {
        console.error('Error fetching traffic state:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Ambulance alert (debounced so it doesn't spam)
  useEffect(() => {
    Object.entries(laneData).forEach(([laneId, lane]) => {
      const prev = prevAmbulanceState.current[laneId] || 0;
      if (lane.ambulances > 0 && prev === 0) {
        const laneNumber = laneId.replace('lane', '');
        toast.error(`🚨 EMERGENCY: Ambulance detected in Lane ${laneNumber}!`, {
          duration: 4000,
          style: {
            background: 'rgb(127, 29, 29)',
            color: '#fff',
            border: '2px solid #FF003C',
            fontSize: '16px',
            fontWeight: 'bold'
          }
        });
      }
      prevAmbulanceState.current[laneId] = lane.ambulances;
    });
  }, [laneData]);

  const handleVideoUpload = async (laneId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/upload-video/${laneId}`, formData);

      const videoUrl = URL.createObjectURL(file);
      setUploadedVideos(prev => ({ ...prev, [laneId]: videoUrl }));
      toast.success(`Video uploaded for Lane ${laneId.replace('lane', '')}`);
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error('Failed to upload video');
    }
  };

  const startProcessing = (laneId) => {
    if (processingIntervals.current[laneId]) return;

    const video = videoRefs.current[laneId];
    const canvas = canvasRefs.current[laneId];

    if (!video || !canvas) return;

    video.play();
    setIsProcessing(prev => ({ ...prev, [laneId]: true }));

    const processFrame = async () => {
      if (frameInFlight.current[laneId]) return;

      if (!video.paused && !video.ended) {
        frameInFlight.current[laneId] = true;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');
            formData.append('generation', String(systemGeneration.current));

            try {
              const response = await axios.post(`${API}/process-frame/${laneId}`, formData);

              setLaneData(prevData => ({
                ...prevData,
                [laneId]: {
                  ...prevData[laneId],
                  vehicles: response.data.vehicles,
                  ambulances: response.data.ambulances,
                  signal: response.data.signal,
                  duration: response.data.duration,
                  density: response.data.density,
                  frame: response.data.frame
                }
              }));

              if (typeof response.data.generation === 'number') {
                systemGeneration.current = response.data.generation;
              }
            } catch (error) {
              console.error('Error processing frame:', error);
            } finally {
              frameInFlight.current[laneId] = false;
            }
          } else {
            frameInFlight.current[laneId] = false;
          }
        }, 'image/jpeg', 0.65);
      } else {
        // Loop video
        video.currentTime = 0;
        video.play();
      }
    };

    processingIntervals.current[laneId] = setInterval(processFrame, 500);
  };

  const stopProcessing = (laneId) => {
    if (processingIntervals.current[laneId]) {
      clearInterval(processingIntervals.current[laneId]);
      delete processingIntervals.current[laneId];
    }

    delete frameInFlight.current[laneId];

    const video = videoRefs.current[laneId];
    if (video) video.pause();

    setIsProcessing(prev => ({ ...prev, [laneId]: false }));
  };

  const resetSystem = async () => {
    try {
      const response = await axios.post(`${API}/reset`);
      if (typeof response.data.generation === 'number') {
        systemGeneration.current = response.data.generation;
      }

      Object.keys(processingIntervals.current).forEach(laneId => stopProcessing(laneId));

      setLaneData({
        lane1: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null },
        lane2: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null },
        lane3: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null },
        lane4: { vehicles: 0, ambulances: 0, signal: 'red', duration: 0, density: 0, frame: null }
      });
      setUploadedVideos({});
      toast.success('System reset successfully');
    } catch (error) {
      console.error('Error resetting system:', error);
      toast.error('Failed to reset system');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#C5C6C7]" data-testid="traffic-dashboard">
      {/* Main Content */}
      <div className="p-4 md:p-8">
        {/* Dashboard Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#66FCF1]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Live Traffic Monitoring
            </h1>
            <p className="text-sm text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              Real-time traffic signal control and vehicle detection
            </p>
          </div>
          <button
            onClick={resetSystem}
            className="px-4 py-2 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-900/40 transition-all duration-300 text-sm font-medium"
            data-testid="reset-system-btn"
          >
            Reset System
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Video Feed Grid */}
          <div className="lg:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['lane1', 'lane2', 'lane3', 'lane4'].map((laneId, index) => (
                <VideoLaneCard
                  key={laneId}
                  laneId={laneId}
                  laneNumber={index + 1}
                  data={laneData[laneId]}
                  isProcessing={isProcessing[laneId]}
                  videoUrl={uploadedVideos[laneId]}
                  onUpload={(file) => handleVideoUpload(laneId, file)}
                  onStart={() => startProcessing(laneId)}
                  onStop={() => stopProcessing(laneId)}
                  videoRef={(ref) => { videoRefs.current[laneId] = ref; }}
                  canvasRef={(ref) => { canvasRefs.current[laneId] = ref; }}
                />
              ))}
            </div>
          </div>

          {/* Analytics Sidebar */}
          <div className="lg:col-span-3">
            <TrafficAnalytics laneData={laneData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
