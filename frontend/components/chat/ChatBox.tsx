'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSignalR } from '@/contexts/SignalRContext';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Cookies from 'js-cookie';

/* ─── Types ─── */
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

/* ─── Helpers ─── */
function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ`;
    const days = Math.floor(hours / 24);
    return `${days} ngày`;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(-2)
        .join('')
        .toUpperCase();
}

const AVATAR_COLORS = [
    'from-violet-500 to-fuchsia-500',
    'from-cyan-500 to-blue-500',
    'from-rose-500 to-orange-400',
    'from-emerald-500 to-teal-400',
    'from-amber-500 to-yellow-400',
    'from-indigo-500 to-purple-500',
];

function avatarColor(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── Sub‑components ─── */

function UserAvatar({ user, size = 'md' }: { user: { id: string; fullName: string; avatar: string | null }; size?: 'sm' | 'md' | 'lg' }) {
    const dim = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-11 h-11 text-sm';
    if (user.avatar) {
        return (
            <img
                src={user.avatar}
                alt={user.fullName}
                className={`${dim} rounded-full object-cover ring-2 ring-white/80 dark:ring-slate-800/80`}
            />
        );
    }
    return (
        <div className={`${dim} rounded-full bg-gradient-to-br ${avatarColor(user.id)} flex items-center justify-center font-semibold text-white ring-2 ring-white/80 dark:ring-slate-800/80 select-none`}>
            {getInitials(user.fullName || user.id.slice(0, 2))}
        </div>
    );
}

function TypingDots() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            <span className="chat-typing-dot" />
            <span className="chat-typing-dot animation-delay-200" />
            <span className="chat-typing-dot animation-delay-400" />
        </div>
    );
}

/* ─── Main component ─── */
const ChatBox = () => {
    const { user } = useAuth();
    const { connection, isConnected } = useSignalR();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const activeSessionIdRef = useRef<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [receiverId, setReceiverId] = useState<string>('');
    const [messageInput, setMessageInput] = useState('');
    const [activeOtherUser, setActiveOtherUser] = useState<ChatSession['otherUser'] | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();

    const currentUserId = user?.id || '';

    /* ── Auth headers ── */
    const getAuthHeaders = () => {
        const token = Cookies.get('supabaseAccessToken') || Cookies.get('accessToken') || '';
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    };

    /* ── Data fetching ── */
    const fetchInbox = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5266';
            const res = await fetch(`${apiUrl}/api/chat/inbox`, { headers: getAuthHeaders() });
            if (res.ok) setSessions(await res.json());
        } catch (err) {
            console.error('Failed to fetch inbox', err);
        }
    };

    const loadHistory = async (otherUserId: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5266';
            const res = await fetch(`${apiUrl}/api/chat/history/${otherUserId}`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setActiveSessionId(data.sessionId);
                activeSessionIdRef.current = data.sessionId;
                setMessages(data.messages);
                setReceiverId(otherUserId);

                // Try to get the user's name from the inbox
                const match = sessions.find(s => s.otherUser.id === otherUserId);
                setActiveOtherUser(match?.otherUser || { id: otherUserId, fullName: otherUserId.slice(0, 8), avatar: null });

                // Focus the input
                setTimeout(() => inputRef.current?.focus(), 100);
            }
        } catch (err) {
            console.error('Failed to load history', err);
        }
    };

    /* ── Lifecycle ── */
    useEffect(() => {
        fetchInbox();
        const targetUserId = searchParams.get('userId');
        if (targetUserId) loadHistory(targetUserId);
    }, [searchParams]);

    // SignalR listener
    useEffect(() => {
        if (connection) {
            connection.on('ReceivePrivateMessage', (msg: ChatMessage & { sessionId: number }) => {
                if (activeSessionIdRef.current === msg.sessionId) {
                    setMessages(prev => {
                        if (prev.find(p => p.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                }
                fetchInbox();
            });
        }
        return () => { connection?.off('ReceivePrivateMessage'); };
    }, [connection, activeSessionId]);

    // Auto‑scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /* ── Send ── */
    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!receiverId.trim() || !messageInput.trim() || isSending) return;

        if (connection && isConnected) {
            setIsSending(true);
            try {
                await connection.invoke('SendMessageToUser', receiverId, messageInput);
                setMessageInput('');
            } catch (err) {
                console.error('Lỗi khi gửi tin nhắn:', err);
            } finally {
                setIsSending(false);
                inputRef.current?.focus();
            }
        }
    };

    /* ── Message grouping ── */
    const groupedMessages = messages.reduce<{ date: string; items: ChatMessage[] }[]>((groups, msg) => {
        const d = new Date(msg.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const last = groups[groups.length - 1];
        if (last && last.date === d) { last.items.push(msg); }
        else { groups.push({ date: d, items: [msg] }); }
        return groups;
    }, []);

    /* ═════════════════════════════════ RENDER ═════════════════════════════════ */
    return (
        <div className="chat-container">
            {/* ────────── SIDEBAR ────────── */}
            <aside className={`chat-sidebar ${sidebarOpen ? '' : 'chat-sidebar--collapsed'}`}>
                {/* Sidebar header */}
                <div className="chat-sidebar__header">
                    <h2 className="chat-sidebar__title">Tin nhắn</h2>
                    <div className="chat-connection-dot" title={isConnected ? 'Đã kết nối' : 'Mất kết nối'}>
                        <span className={`chat-dot ${isConnected ? 'chat-dot--online' : 'chat-dot--offline'}`} />
                    </div>
                </div>

                {/* Session list */}
                <div className="chat-sidebar__list">
                    {sessions.length === 0 && (
                        <div className="chat-sidebar__empty">
                            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                            <p className="text-sm text-slate-400 dark:text-slate-500">Chưa có cuộc trò chuyện nào</p>
                        </div>
                    )}
                    {sessions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => loadHistory(s.otherUser.id)}
                            className={`chat-session-item ${activeSessionId === s.id ? 'chat-session-item--active' : ''}`}
                        >
                            <UserAvatar user={s.otherUser} size="md" />
                            <div className="chat-session-item__info">
                                <span className="chat-session-item__name">
                                    {s.otherUser.fullName || s.otherUser.id.slice(0, 8)}
                                </span>
                                <span className="chat-session-item__preview">
                                    {s.lastMessage || 'Bắt đầu trò chuyện...'}
                                </span>
                            </div>
                            <span className="chat-session-item__time">
                                {timeAgo(s.lastMessageAt)}
                            </span>
                        </button>
                    ))}
                </div>
            </aside>

            {/* ────────── MAIN CHAT ────────── */}
            <main className="chat-main">
                {activeSessionId && activeOtherUser ? (
                    <>
                        {/* Chat header */}
                        <header className="chat-main__header">
                            <button
                                className="chat-back-btn lg:hidden"
                                onClick={() => { setActiveSessionId(null); setActiveOtherUser(null); }}
                                aria-label="Quay lại"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <UserAvatar user={activeOtherUser} size="md" />
                            <div className="chat-main__header-info">
                                <h3 className="chat-main__header-name">
                                    {activeOtherUser.fullName || activeOtherUser.id.slice(0, 8)}
                                </h3>
                                <span className={`chat-main__header-status ${isConnected ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {isConnected ? 'Đang hoạt động' : 'Ngoại tuyến'}
                                </span>
                            </div>
                        </header>

                        {/* Messages */}
                        <div className="chat-messages">
                            {groupedMessages.map(group => (
                                <div key={group.date}>
                                    <div className="chat-date-divider">
                                        <span>{group.date}</span>
                                    </div>
                                    {group.items.map((msg, idx) => {
                                        const isMe = msg.senderId === currentUserId || msg.senderId !== receiverId;
                                        const prev = group.items[idx - 1];
                                        const sameSender = prev && prev.senderId === msg.senderId;
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`chat-bubble-row ${isMe ? 'chat-bubble-row--me' : 'chat-bubble-row--them'} ${sameSender ? 'chat-bubble-row--grouped' : ''}`}
                                            >
                                                {!isMe && !sameSender && (
                                                    <UserAvatar user={activeOtherUser} size="sm" />
                                                )}
                                                {!isMe && sameSender && <div className="w-9" />}
                                                <div className={`chat-bubble ${isMe ? 'chat-bubble--me' : 'chat-bubble--them'}`}>
                                                    <p>{msg.content}</p>
                                                    <time className={`chat-bubble__time ${isMe ? 'chat-bubble__time--me' : 'chat-bubble__time--them'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </time>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={sendMessage} className="chat-input-bar">
                            <input
                                ref={inputRef}
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                placeholder="Nhập tin nhắn..."
                                className="chat-input"
                                disabled={!isConnected}
                            />
                            <button
                                type="submit"
                                disabled={!isConnected || !messageInput.trim() || isSending}
                                className="chat-send-btn"
                                aria-label="Gửi tin nhắn"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </button>
                        </form>
                    </>
                ) : (
                    /* Empty state */
                    <div className="chat-empty-state">
                        <div className="chat-empty-state__icon">
                            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                        </div>
                        <h3 className="chat-empty-state__title">Chọn cuộc trò chuyện</h3>
                        <p className="chat-empty-state__text">
                            Chọn một người trong danh sách hoặc bắt đầu trò chuyện mới từ trang sản phẩm.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ChatBox;
