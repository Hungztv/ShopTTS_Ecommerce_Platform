'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSignalR } from '@/contexts/SignalRContext';
import { useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';

interface ChatMessage {
    id: number;
    senderId: string;
    content: string;
    createdAt: string;
    isRead: boolean;
}

interface ChatSession {
    id: number;
    otherUser: {
        id: string;
        fullName: string;
        avatar: string | null;
    };
    lastMessage: string | null;
    lastMessageAt: string | null;
}

const ChatBox = () => {
    const { connection, isConnected } = useSignalR();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [receiverId, setReceiverId] = useState<string>(''); // Dùng để tạo chat mới
    const [messageInput, setMessageInput] = useState('');
    const [currentUserId, setCurrentUserId] = useState<string>(''); // Cần lấy từ auth state thật, ở đây tạm giả lập hoặc lấy từ token
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = useSearchParams();

    // Fetch inbox khi component mount
    useEffect(() => {
        fetchInbox();
        // Lấy userId hiện tại từ AuthContext (token payload) hoặc API
        // Tạm thời nếu backend không yêu cầu currentUserId (do đọc từ token) thì không cần
        // vì token đã được gửi qua header.
        
        // Tự động mở chat nếu có URL query parameter ?userId=...
        const targetUserId = searchParams.get('userId');
        if (targetUserId) {
            loadHistory(targetUserId);
        }
    }, [searchParams]);

    const getAuthHeaders = () => {
        const token = Cookies.get('supabaseAccessToken') || Cookies.get('accessToken') || '';
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    };

    const fetchInbox = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5266';
            const res = await fetch(`${apiUrl}/api/chat/inbox`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (err) {
            console.error('Failed to fetch inbox', err);
        }
    };

    const loadHistory = async (otherUserId: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5266';
            const res = await fetch(`${apiUrl}/api/chat/history/${otherUserId}`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data = await res.json();
                setActiveSessionId(data.sessionId);
                setMessages(data.messages);
                setReceiverId(otherUserId);
            }
        } catch (err) {
            console.error('Failed to load history', err);
        }
    };

    // Lắng nghe tin nhắn tới
    useEffect(() => {
        if (connection) {
            // Sự kiện này phải match với tên hàm gửi từ backend
            connection.on('ReceivePrivateMessage', (msg: ChatMessage & { sessionId: number }) => {
                // Thêm vào danh sách message nếu đang mở đúng phòng chat
                setMessages(prev => {
                    // Tránh duplicate nếu event gửi lại cho chính mình 
                    if (prev.find(p => p.id === msg.id)) return prev;
                    return [...prev, msg];
                });

                // Cập nhật lại inbox preview
                setSessions(prev => prev.map(s => {
                    if (s.id === msg.sessionId) {
                        return { ...s, lastMessage: msg.content, lastMessageAt: msg.createdAt };
                    }
                    return s;
                }));
            });
        }

        return () => {
            if (connection) {
                connection.off('ReceivePrivateMessage');
            }
        };
    }, [connection, activeSessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!receiverId.trim() || !messageInput.trim()) {
            return;
        }

        if (connection && isConnected) {
            try {
                // Gọi method SendMessageToUser trên Hub
                await connection.invoke('SendMessageToUser', receiverId, messageInput);
                setMessageInput('');
            } catch (err) {
                console.error('Lỗi khi gửi tin nhắn:', err);
                alert('Không thể gửi tin nhắn.');
            }
        } else {
            alert('Chưa kết nối đến server chat.');
        }
    };

    return (
        <div className="flex h-[600px] max-w-4xl mx-auto border rounded-lg shadow-lg overflow-hidden bg-white">
            {/* Sidebar Inbox */}
            <div className="w-1/3 bg-gray-50 border-r flex flex-col">
                <div className="p-4 bg-primary text-white font-bold flex justify-between items-center">
                    <span>Chat Inbox</span>
                    <span className="text-xs">{isConnected ? '🟢' : '🔴'}</span>
                </div>
                
                {/* Form tạo chat mới nhanh */}
                <div className="p-3 border-b bg-white">
                    <p className="text-xs text-gray-500 mb-2">Bắt đầu chat mới (Nhập ID của người nhận):</p>
                    <input 
                        type="text" 
                        placeholder="VD: user-id-cua-nguoi-ban..."
                        className="w-full p-2 text-sm border rounded"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                loadHistory(e.currentTarget.value);
                                e.currentTarget.value = '';
                            }
                        }}
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {sessions.map(s => (
                        <div 
                            key={s.id} 
                            onClick={() => loadHistory(s.otherUser.id)}
                            className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${activeSessionId === s.id ? 'bg-blue-50' : ''}`}
                        >
                            <div className="font-semibold text-sm">{s.otherUser.fullName || s.otherUser.id}</div>
                            <div className="text-xs text-gray-500 truncate">{s.lastMessage || 'Chưa có tin nhắn'}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat View */}
            <div className="flex-1 flex flex-col bg-white">
                {activeSessionId ? (
                    <>
                        <div className="p-4 border-b bg-gray-50 flex items-center shadow-sm">
                            <span className="font-semibold">Đang chat với: {receiverId}</span>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-4">
                            {messages.map((msg) => {
                                // Xác định tin nhắn là của mình hay của người kia
                                // Lý tưởng nhất là so sánh msg.senderId === currentUserId
                                // Tạm thời nếu token lấy được thì dùng
                                const isMe = currentUserId ? msg.senderId === currentUserId : msg.senderId !== receiverId;
                                
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div 
                                            className={`px-4 py-2 rounded-2xl max-w-[70%] text-sm ${
                                                isMe 
                                                    ? 'bg-blue-500 text-white rounded-br-none' 
                                                    : 'bg-gray-100 text-gray-800 border rounded-bl-none'
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1">
                                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={sendMessage} className="p-3 bg-gray-50 border-t flex gap-2">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Nhập tin nhắn..."
                                className="flex-1 p-2 border rounded-full text-sm focus:outline-none focus:border-primary"
                                disabled={!isConnected}
                            />
                            <button
                                type="submit"
                                disabled={!isConnected || !messageInput.trim()}
                                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Gửi
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        Chọn một cuộc trò chuyện hoặc nhập User ID để bắt đầu.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatBox;
