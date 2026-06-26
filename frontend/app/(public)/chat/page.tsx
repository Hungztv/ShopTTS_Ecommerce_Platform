import React, { Suspense } from 'react';
import { SignalRProvider } from '@/contexts/SignalRContext';
import ChatBox from '@/components/chat/ChatBox';

export const metadata = {
    title: 'Phòng Chat | Shop_TTS_v1',
    description: 'Thử nghiệm tính năng chat realtime với SignalR',
};

export default function ChatPage() {
    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-8">
                <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                    Thử nghiệm Realtime Chat
                </h1>
                <p className="mt-4 text-lg text-gray-500">
                    Mở trang này trên 2 trình duyệt hoặc 2 tab khác nhau để thử nghiệm tính năng nhắn tin thời gian thực.
                </p>
            </div>
            
            {/* 
              Wrap ChatBox bên trong SignalRProvider 
              chỉ ở trang này để không ảnh hưởng toàn app
            */}
            <SignalRProvider>
                <Suspense fallback={<div>Loading chat...</div>}>
                    <ChatBox />
                </Suspense>
            </SignalRProvider>
        </div>
    );
}
