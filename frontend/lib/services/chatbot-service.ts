import axios from 'axios';
import { getSessionId } from './behavior-service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5266/api';

// ══════════════════════════════════════════
//  Types
// ══════════════════════════════════════════

export interface ChatProduct {
    id: number;
    name: string;
    slug: string;
    price: number;
    image: string;
    brandName: string;
    categoryName: string;
    shopName?: string;
    averageScore: number;
    ratingCount: number;
    soldOut: number;
    isInStock: boolean;
    shortDescription?: string;
    highlightBadge?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    products?: ChatProduct[];
    suggestions?: string[];
    actions?: any[];
    citations?: any[];
    intent?: string;
    timestamp: Date;
    isStreaming?: boolean;
}

export interface ChatBotResponse {
    success: boolean;
    data?: {
        reply: string;
        products: ChatProduct[];
        suggestions: string[];
        intent: string;
        model: string;
        usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
        };
    };
    message?: string;
}

export interface ChatCoupon {
    code: string;
    name: string;
    description: string;
    discount: string;
    minOrder: number;
    expiresAt: string;
    remaining: number;
}

// ══════════════════════════════════════════
//  Non-streaming API
// ══════════════════════════════════════════

export async function sendChatMessage(
    message: string,
    history: { role: string; content: string }[]
): Promise<ChatBotResponse> {
    try {
        const res = await axios.post<ChatBotResponse>(`${API_URL}/ChatBot/send`, {
            message,
            history,
            sessionId: getSessionId(),
        });
        return res.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.data) {
            return error.response.data as ChatBotResponse;
        }
        return {
            success: false,
            message: 'Không thể kết nối đến chatbot. Vui lòng thử lại sau.',
        };
    }
}

// ══════════════════════════════════════════
//  Streaming API (SSE)
// ══════════════════════════════════════════

export interface StreamCallbacks {
    onToken: (token: string) => void;
    onProducts: (products: ChatProduct[]) => void;
    onSuggestions: (suggestions: string[]) => void;
    onIntent: (intent: string) => void;
    onCleanReply: (reply: string) => void;
    onActions?: (actions: any[]) => void;
    onCitations?: (citations: any[]) => void;
    onDone: () => void;
    onError: (message: string) => void;
}

export async function streamChatMessage(
    message: string,
    history: { role: string; content: string }[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal
): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/ChatBot/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, sessionId: getSessionId() }),
            signal,
        });

        if (!response.ok || !response.body) {
            callbacks.onError('Không thể kết nối đến chatbot');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    const eventType = line.slice(7).trim();
                    // Next line should be "data: ..."
                    continue;
                }
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    // Find last event type
                    const eventLine = lines.find(
                        (l, i) => l.startsWith('event: ') && lines.indexOf(line) > i
                    );

                    // We need to parse event+data pairs
                    handleSSEData(data, callbacks);
                }
            }
        }
    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            callbacks.onError('Kết nối bị gián đoạn');
        }
    }
}

// Parse SSE with event types
export async function streamChatMessageV2(
    message: string,
    history: { role: string; content: string }[],
    callbacks: StreamCallbacks,
    signal?: AbortSignal
): Promise<void> {
    try {
        const response = await fetch(`${API_URL}/ChatBot/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, sessionId: getSessionId() }),
            signal,
        });

        if (!response.ok || !response.body) {
            callbacks.onError('Không thể kết nối đến chatbot');
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let dataLines: string[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    // If we had pending data from previous event, flush it
                    if (currentEvent && dataLines.length > 0) {
                        processSSEvent(currentEvent, dataLines.join('\n'), callbacks);
                        dataLines = [];
                    }
                    currentEvent = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                    dataLines.push(line.slice(6));
                } else if (line.trim() === '') {
                    // Empty line = end of SSE event, flush accumulated data
                    if (currentEvent && dataLines.length > 0) {
                        processSSEvent(currentEvent, dataLines.join('\n'), callbacks);
                        dataLines = [];
                    }
                }
                // Empty line = end of event (SSE spec)
            }
        }

        // Flush any remaining pending event
        if (currentEvent && dataLines.length > 0) {
            processSSEvent(currentEvent, dataLines.join('\n'), callbacks);
        }

        // Process remaining buffer
        if (buffer.trim()) {
            const lines = buffer.split('\n');
            let remainingEvent = '';
            const remainingData: string[] = [];
            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    if (remainingEvent && remainingData.length > 0) {
                        processSSEvent(remainingEvent, remainingData.join('\n'), callbacks);
                        remainingData.length = 0;
                    }
                    remainingEvent = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                    remainingData.push(line.slice(6));
                }
            }
            if (remainingEvent && remainingData.length > 0) {
                processSSEvent(remainingEvent, remainingData.join('\n'), callbacks);
            }
        }
    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            callbacks.onError('Kết nối bị gián đoạn');
        }
    }
}

function processSSEvent(event: string, data: string, cb: StreamCallbacks) {
    switch (event) {
        case 'token':
            cb.onToken(data);
            break;
        case 'products':
            try { cb.onProducts(JSON.parse(data)); } catch {}
            break;
        case 'suggestions':
            try { cb.onSuggestions(JSON.parse(data)); } catch {}
            break;
        case 'actions':
            try { cb.onActions && cb.onActions(JSON.parse(data)); } catch {}
            break;
        case 'citations':
            try { cb.onCitations && cb.onCitations(JSON.parse(data)); } catch {}
            break;
        case 'intent':
            cb.onIntent(data);
            break;
        case 'clean_reply':
            try { cb.onCleanReply(JSON.parse(data)); } catch { cb.onCleanReply(data); }
            break;
        case 'done':
            cb.onDone();
            break;
        case 'error':
            try {
                const err = JSON.parse(data);
                cb.onError(err.message || 'Đã xảy ra lỗi');
            } catch {
                cb.onError('Đã xảy ra lỗi');
            }
            break;
    }
}

function handleSSEData(data: string, cb: StreamCallbacks) {
    // Fallback for simple parsing
    if (data === '{}') {
        cb.onDone();
    } else {
        cb.onToken(data);
    }
}

// ══════════════════════════════════════════
//  Additional APIs
// ══════════════════════════════════════════

export async function getRecommendations(productId: number): Promise<ChatProduct[]> {
    try {
        const res = await axios.get(`${API_URL}/ChatBot/recommend/${productId}`);
        return res.data?.data ?? [];
    } catch {
        return [];
    }
}

export async function getTrendingProducts(limit: number = 8): Promise<ChatProduct[]> {
    try {
        const res = await axios.get(`${API_URL}/ChatBot/trending`, { params: { limit } });
        return res.data?.data ?? [];
    } catch {
        return [];
    }
}

export async function getActiveCoupons(): Promise<ChatCoupon[]> {
    try {
        const res = await axios.get(`${API_URL}/ChatBot/coupons`);
        return res.data?.data ?? [];
    } catch {
        return [];
    }
}

// ══════════════════════════════════════════
//  Chat history persistence (localStorage)
// ══════════════════════════════════════════

const STORAGE_KEY = 'shoptts_chat_history';
const MAX_STORED_MESSAGES = 50;

export function saveChatHistory(messages: ChatMessage[]): void {
    try {
        const serializable = messages.slice(-MAX_STORED_MESSAGES).map(m => ({
            ...m,
            timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
            isStreaming: undefined,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {}
}

export function loadChatHistory(): ChatMessage[] | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored) as ChatMessage[];
        return parsed.map(m => ({
            ...m,
            timestamp: new Date(m.timestamp),
        }));
    } catch {
        return null;
    }
}

export function clearChatHistory(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
