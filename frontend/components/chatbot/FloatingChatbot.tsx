'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import './chatbot.css';
import Cookies from 'js-cookie';

type ProductInfo = {
    id: number;
    name: string;
    price: number;
    imageUrl: string;
    slug: string;
    shopName: string;
};

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    products?: ProductInfo[];
    suggestions?: string[];
    intent?: string;
};

export default function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize session and welcome message
    useEffect(() => {
        setSessionId(Math.random().toString(36).substring(2, 15));
        setMessages([
            {
                id: 'welcome',
                role: 'assistant',
                content: 'Chào bạn! 👋 Mình là trợ lý AI của ShopTTS. Mình có thể giúp bạn tìm kiếm sản phẩm, kiểm tra đơn hàng, hoặc gợi ý mua sắm. Bạn cần hỗ trợ gì ạ?',
                suggestions: ['Tìm điện thoại dưới 5 triệu', 'Kiểm tra đơn hàng', 'Mã giảm giá hôm nay']
            }
        ]);
    }, []);

    // Auto scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    const handleSend = async (text: string = input) => {
        if (!text.trim() || isLoading) return;

        const userMsgId = Date.now().toString();
        const newMessages: ChatMessage[] = [
            ...messages,
            { id: userMsgId, role: 'user', content: text }
        ];

        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const token = Cookies.get('accessToken');
            
            // Format history for backend
            const history = messages
                .filter(m => m.id !== 'welcome') // exclude welcome message from history to save tokens
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            const res = await fetch('http://localhost:5266/api/ChatBot/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    message: text,
                    history: history.slice(-10), // Only send last 10 messages for context
                    sessionId: sessionId
                })
            });

            const data = await res.json();

            if (data.success) {
                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: data.data.reply,
                        products: data.data.products,
                        suggestions: data.data.suggestions,
                        intent: data.data.intent
                    }
                ]);
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: `Xin lỗi, có lỗi xảy ra: ${data.message || 'Hệ thống AI đang bận.'}`
                    }
                ]);
            }
        } catch (error) {
            console.error('ChatBot Error:', error);
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chatbot-overlay">
            {/* The Chat Window */}
            <div className={`chatbot-window ${isOpen ? 'is-open' : ''}`}>
                <div className="chatbot-header">
                    <div className="flex items-center gap-3">
                        <div className="chatbot-avatar">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">ShopTTS Assistant</h3>
                            <div className="chatbot-status">
                                <div className="status-dot"></div>
                                <span>Sẵn sàng hỗ trợ</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="chatbot-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`chat-message ${msg.role}`}>
                            <div className="message-bubble">
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-a:text-violet-500 prose-strong:text-violet-700 dark:prose-strong:text-violet-400">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <span>{msg.content}</span>
                                )}
                            </div>

                            {/* Render Products Carousel if any */}
                            {msg.products && msg.products.length > 0 && (
                                <div className="chatbot-products">
                                    {msg.products.map(product => (
                                        <Link 
                                            href={`/products/${product.slug}`} 
                                            key={product.id}
                                            className="chatbot-product-card"
                                        >
                                            <div className="product-img-wrapper">
                                                <img 
                                                    src={`http://localhost:5266${product.imageUrl}`} 
                                                    alt={product.name}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder-product.png';
                                                    }}
                                                />
                                            </div>
                                            <div className="product-info">
                                                <div className="product-name" title={product.name}>
                                                    {product.name}
                                                </div>
                                                <div className="product-price">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* Render Suggestions if any */}
                            {msg.suggestions && msg.suggestions.length > 0 && (
                                <div className="chatbot-suggestions">
                                    {msg.suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(suggestion)}
                                            className="suggestion-pill"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {isLoading && (
                        <div className="chat-message ai">
                            <div className="message-bubble">
                                <div className="typing-indicator">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chatbot-input-container">
                    <div className="chatbot-input-wrapper">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Hỏi ShopTTS Assistant..."
                            className="chatbot-textarea"
                            rows={1}
                        />
                        <button 
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                            className="chatbot-send-btn"
                        >
                            <Send size={16} className={input.trim() && !isLoading ? 'translate-x-[2px]' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <button 
                className={`chatbot-fab ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Open AI Assistant"
            >
                {isOpen ? <X size={24} /> : <Bot size={28} />}
            </button>
        </div>
    );
}
