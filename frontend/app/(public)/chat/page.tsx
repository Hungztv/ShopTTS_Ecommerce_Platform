'use client';

import React, { Suspense } from 'react';
import { SignalRProvider } from '@/contexts/SignalRContext';
import ChatBox from '@/components/chat/ChatBox';
import '@/components/chat/chat.css';

export default function ChatPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-violet-50/30 dark:from-[#0a0a12] dark:via-[#0f0e17] dark:to-[#1a1625] py-8 px-4">
            <SignalRProvider>
                <Suspense fallback={
                    <div className="flex items-center justify-center h-[60vh]">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm text-slate-400">Đang kết nối...</span>
                        </div>
                    </div>
                }>
                    <ChatBox />
                </Suspense>
            </SignalRProvider>
        </div>
    );
}
