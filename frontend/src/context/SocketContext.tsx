import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { API_URL, getAccessToken } from "../api/client";
import { useAuth } from "./AuthContext";

interface SocketContextValue {
  socket: Socket | null;
  onlineCount: number;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, onlineCount: 0 });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    forceRender((n) => n + 1);

    socket.on("presence:onlineCount", ({ count }: { count: number }) => setOnlineCount(count));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineCount }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
