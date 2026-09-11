'use client'

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { parseCookies } from 'nookies';
import { API_BASE_URL } from '../../config';

interface SocketContextData {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext({} as SocketContextData);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const { '@servFixe.token': token } = parseCookies();
        if (!token) return;

        // URL direta do backend para WebSockets (proxy da Vercel nao suporta WebSockets)
        const socketUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? 'https://server-restourant.onrender.com'
            : API_BASE_URL;

        const socketInstance = io(socketUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });

        socketInstance.on('connect', () => {
            console.log('Socket conectado:', socketInstance.id);
            setIsConnected(true);

        });

        socketInstance.on('disconnect', () => {
            console.log('Socket desconectado');
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    )
}

export const useSocket = () => useContext(SocketContext);
