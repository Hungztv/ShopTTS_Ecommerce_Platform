'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import Cookies from 'js-cookie';

interface SignalRContextType {
    connection: signalR.HubConnection | null;
    isConnected: boolean;
}

const SignalRContext = createContext<SignalRContextType>({
    connection: null,
    isConnected: false,
});

export const SignalRProvider = ({ children }: { children: React.ReactNode }) => {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Backend URL - Thường được lưu trong biến môi trường
        // Chú ý: .env ở Next.js thường có NEXT_PUBLIC_API_URL là http://localhost:5266/api
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5266';
        if (apiUrl.endsWith('/api')) {
            apiUrl = apiUrl.substring(0, apiUrl.length - 4);
        }

        // Lấy token từ cookies (cùng cách AuthContext đang dùng)
        const getToken = () => {
            return Cookies.get('supabaseAccessToken') || Cookies.get('accessToken') || '';
        };

        // Nếu chưa đăng nhập (chưa có token), không kết nối
        if (!getToken()) {
            console.log('SignalR: No token found, skipping connection.');
            return;
        }
        
        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(`${apiUrl}/chathub`, {
                accessTokenFactory: () => getToken(),
            })
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        // Khởi động kết nối
        newConnection.start()
            .then(() => {
                console.log('SignalR Connected!');
                setIsConnected(true);
            })
            .catch(e => {
                console.error('SignalR Connection Error: ', e);
                setIsConnected(false);
            });

        // Cleanup function
        return () => {
            if (newConnection) {
                newConnection.stop();
            }
        };
    }, []);

    return (
        <SignalRContext.Provider value={{ connection, isConnected }}>
            {children}
        </SignalRContext.Provider>
    );
};

export const useSignalR = () => useContext(SignalRContext);
