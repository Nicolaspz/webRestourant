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
        // URL do backend direta para AWS (Vercel proxy não suporta WebSockets)
        const socketUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? 'http://13.62.222.99:3333' // URL DIRETA DA AWS
            : API_BASE_URL;

        const socketInstance = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 5000,
        });

        socketInstance.on('connect', () => {
            console.log('Socket conectado:', socketInstance.id);
            setIsConnected(true);

            // Entrar na sala da organização se o usuário estiver logado
            const { '@servFixe.organizationId': orgId } = parseCookies();
            if (orgId) {
                socketInstance.emit('join', orgId);
                console.log(`Solicitado entrada na sala: ${orgId}`);
            }
        });

        socketInstance.on('disconnect', () => {
            console.log('Socket desconectado');
            setIsConnected(false);
        });

        // Log para debug de eventos recebidos
        socketInstance.onAny((event, ...args) => {
            console.log(`[Socket] Evento recebido: ${event}`, args);
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
