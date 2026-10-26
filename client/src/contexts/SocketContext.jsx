import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map()); // event -> Set of callbacks

  // Connect when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      socket.emit('register', user._id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // ── Task events ──
    socket.on('task:assigned', ({ task }) => {
      toast.success(`📋 New task assigned: "${task.title}"`, { duration: 6000 });
      emit('task:assigned', task);
    });

    socket.on('task:created', ({ task }) => {
      emit('task:created', task);
    });

    socket.on('task:statusChanged', (data) => {
      const msg = `Task "${data.taskTitle}" → ${data.status.replace(/-/g, ' ')}`;
      toast(msg, { icon: '🔄', duration: 4000 });
      emit('task:statusChanged', data);
    });

    socket.on('task:explanation-approved', (data) => {
      toast.success(`💡 AI explanation ready for "${data.taskTitle}"`, { duration: 6000 });
      emit('task:explanation-approved', data);
    });

    // ── Meeting events ──
    socket.on('meeting:scheduled', ({ meeting }) => {
      toast.success(`📅 Meeting scheduled: ${meeting.reviewStage?.replace(/-/g, ' ')}`, { duration: 6000 });
      emit('meeting:scheduled', meeting);
    });

    // ── Feedback events ──
    socket.on('feedback:approved', (data) => {
      toast.success(`💬 ${data.message}`, { duration: 8000 });
      emit('feedback:approved', data);
    });

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user?._id]);

  // Internal emit to registered listeners
  const emit = useCallback((event, data) => {
    const cbs = listenersRef.current.get(event);
    if (cbs) cbs.forEach(cb => cb(data));
  }, []);

  // External: subscribe to a socket event
  const subscribe = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);
    return () => {
      listenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ subscribe, socketRef }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
