import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CompareProvider } from "@/contexts/CompareContext";import { NotificationProvider } from '@/contexts/NotificationContext';import CompareBar from "@/components/ui/CompareBar";
import { Toaster } from "sonner";
import ChatBotWidget from "@/components/ChatBotWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopTTS - Thương mại điện tử hàng đầu Việt Nam",
  description:
    "Mua sắm online hàng triệu sản phẩm chính hãng với giá tốt nhất. Miễn phí vận chuyển, đổi trả dễ dàng.",
  keywords: ["thương mại điện tử", "mua sắm online", "ShopTTS", "điện thoại", "laptop"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NotificationProvider>
            <CartProvider>
              <WishlistProvider>
                <CompareProvider>
                  {children}
                  <CompareBar />
                  <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    toastOptions={{
                      duration: 3000,
                    }}
                  />
                </CompareProvider>
              </WishlistProvider>
            </CartProvider>
          </NotificationProvider>
          <ChatBotWidget />
        </AuthProvider>
      </body>
    </html>
  );
}

