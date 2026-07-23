import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  if (!socketRef.current) {
    socketRef.current = io('http://localhost:5000');
  }

  useEffect(() => {
    const socket = socketRef.current;
    const username = localStorage.getItem('username');
    if (username) socket.emit('registerUser', username);

    socket.on('onlineUsers', setOnlineUsers);
    return () => socket.off('onlineUsers', setOnlineUsers);
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}