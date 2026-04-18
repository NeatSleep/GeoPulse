import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * WebSocket hook for real-time geopolitical events
 * Connects to backend Socket.io server and listens for pipeline complete events
 */
export default function useWebSocket({ onNewEvent, onStatsUpdate } = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('[WebSocket] ✅ Connected to backend (socket ID:', newSocket.id, ')');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[WebSocket] ❌ Disconnected from backend');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('[WebSocket] 🔴 Error:', error);
    });

    // Listen for pipeline complete events
    newSocket.on('pipeline_complete', (data) => {
      console.log('[WebSocket] 📡 Pipeline complete event received:', data.total, 'events');

      // Trigger stats update
      if (onStatsUpdate && data.total > 0) {
        onStatsUpdate({
          total_events: data.total,
        });
      }

      // Trigger UI refresh by notifying about new events
      if (onNewEvent && data.events && data.events.length > 0) {
        console.log('[WebSocket] 🔄 Broadcasting', data.events.length, 'events to UI');
        data.events.forEach(event => {
          onNewEvent(event);
        });
      }
    });

    // Connection error handler
    newSocket.on('connect_error', (error) => {
      console.warn('[WebSocket] ⚠️ Connection error:', error.message || error);
    });

    console.log('[WebSocket] 🔌 Attempting to connect to http://localhost:5000...');

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [onNewEvent, onStatsUpdate]);

  return { isConnected, socket };
}
