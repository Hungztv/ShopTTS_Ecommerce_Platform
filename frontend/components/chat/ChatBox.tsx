'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSignalR } from '@/contexts/SignalRContext';

interface ChatMessage {
    user: string;
    message: string;
    timestamp: Date;
}

const ChatBox = () => {
    const { connection, isConnected } = useSignalR();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [user, setUser] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Lắng nghe tin nhắn tới
    useEffect(() => {
        if (connection) {
            // Lắng nghe sự kiện "ReceiveMessage" từ backend
            connection.on('ReceiveMessage', (user: string, message: string) => {
                const newMessage: ChatMessage = {
                    user,
                    message,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, newMessage]);
            });

            // Lắng nghe thông báo hệ thống (UserConnected/UserDisconnected)
            connection.on('UserConnected', (connectionId: string) => {
                console.log(`User connected: ${connectionId}`);
            });
        }

        // Cleanup listener khi component unmount
        return () => {
            if (connection) {
                connection.off('ReceiveMessage');
                connection.off('UserConnected');
            }
        };
    }, [connection]);

    // Cuộn xuống cuối mỗi khi có tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user.trim()) {
            alert('Vui lòng nhập tên của bạn');
            return;
        }

        if (!messageInput.trim()) {
            return;
        }

        if (connection && isConnected) {
            try {
                // Gọi method "SendMessage" trên backend ChatHub
                await connection.invoke('SendMessage', user, messageInput);
                setMessageInput(''); // Xóa ô input sau khi gửi
            } catch (err) {
                console.error('Lỗi khi gửi tin nhắn:', err);
                alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
            }
        } else {
            alert('Chưa kết nối đến server chat.');
        }
    };

    return (
        <div className="flex flex-col h-[500px] max-w-md mx-auto border rounded-lg shadow-lg overflow-hidden bg-white">
            <div className="bg-primary text-white p-4">
                <h3 className="font-bold text-lg">Phòng Chat Công Khai</h3>
                <p className="text-xs opacity-80">
                    Trạng thái: {isConnected ? 'Đã kết nối 🟢' : 'Đang ngắt kết nối 🔴'}
                </p>
            </div>

            <div className="p-4 bg-gray-50 border-b">
                <input
                    type="text"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="Nhập tên hiển thị của bạn..."
                    className="w-full p-2 border rounded-md text-sm focus:outline-none focus:border-primary"
                    disabled={!isConnected}
                />
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm mt-10">
                        Chưa có tin nhắn nào. Hãy là người đầu tiên!
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.user === user;
                        return (
                            <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-xs text-gray-500 mb-1 px-1">{msg.user}</span>
                                <div 
                                    className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                                        isMe 
                                            ? 'bg-blue-500 text-white rounded-br-none' 
                                            : 'bg-white text-gray-800 border rounded-bl-none shadow-sm'
                                    }`}
                                >
                                    {msg.message}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1">
                                    {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
                <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={user ? "Nhập tin nhắn..." : "Vui lòng nhập tên trước..."}
                    className="flex-1 p-2 border rounded-full text-sm focus:outline-none focus:border-primary"
                    disabled={!isConnected || !user}
                />
                <button
                    type="submit"
                    disabled={!isConnected || !user || !messageInput.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
