import { useState, useEffect, useRef } from 'react';

export const useTrafficSocket = (wsUrl = 'ws://localhost:8000/ws/traffic') => {
  const [laneData, setLaneData] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, live, fallback
  const socketRef = useRef(null);

  useEffect(() => {
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          setConnectionStatus('live');
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'frame_update' && data.lane_id) {
              setLaneData((prev) => ({
                ...prev,
                [data.lane_id]: data,
              }));
              if (data.rtsp_status) {
                setConnectionStatus(data.rtsp_status);
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        socket.onerror = () => {
          setConnectionStatus('reconnecting');
        };

        socket.onclose = () => {
          setIsConnected(false);
          setConnectionStatus('reconnecting');
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };
      } catch (e) {
        setConnectionStatus('fallback');
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) socketRef.current.close();
    };
  }, [wsUrl]);

  return { laneData, isConnected, connectionStatus };
};
