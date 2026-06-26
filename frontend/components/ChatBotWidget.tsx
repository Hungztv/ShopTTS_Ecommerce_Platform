"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageCircle,
  X,
  Send,
  Trash2,
  ChevronDown,
  ShoppingCart,
  Star,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Sparkles,
  Tag,
  TrendingUp,
  Package,
  Volume2,
  VolumeX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  type ChatMessage,
  type ChatProduct,
  streamChatMessageV2,
  sendChatMessage,
  getActiveCoupons,
  saveChatHistory,
  loadChatHistory,
  clearChatHistory,
  type ChatCoupon,
} from "@/lib/services/chatbot-service";

// ══════════════════════════════════════════
//  Constants
// ══════════════════════════════════════════

const GREETING_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Xin chào! 👋 Tôi là trợ lý mua sắm AI của **ShopTTS**.\n\nTôi có thể giúp bạn:\n- 🔍 Tìm kiếm sản phẩm\n- 💰 So sánh giá cả\n- 🏷️ Tìm mã giảm giá\n- 📦 Tra cứu đơn hàng\n- 🔥 Xem sản phẩm trending\n\nBạn cần tôi giúp gì?",
  timestamp: new Date(),
  suggestions: [
    "Tìm điện thoại Samsung",
    "Sản phẩm trending hôm nay",
    "Mã giảm giá có sẵn",
    "Laptop dưới 20 triệu",
  ],
};

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: "Trending", message: "Sản phẩm trending hôm nay" },
  { icon: Tag, label: "Giảm giá", message: "Có mã giảm giá nào không?" },
  { icon: Package, label: "Đơn hàng", message: "Tra cứu đơn hàng của tôi" },
  {
    icon: Sparkles,
    label: "Gợi ý",
    message: "Gợi ý sản phẩm phổ biến nhất",
  },
];

// ══════════════════════════════════════════
//  Sound notification
// ══════════════════════════════════════════

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Silently fail
  }
}

// ══════════════════════════════════════════
//  Format helpers
// ══════════════════════════════════════════

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// ══════════════════════════════════════════
//  Product Card
// ══════════════════════════════════════════

function ProductCard({
  product,
  onAddToCart,
}: {
  product: ChatProduct;
  onAddToCart?: (id: number) => void;
}) {
  return (
    <div className="min-w-[200px] max-w-[200px] bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <a
        href={`/products/${product.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="relative w-full h-[140px] bg-gray-50">
          <img
            src={product.image || "/placeholder.png"}
            alt={product.name}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
          {!product.isInStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-xs font-semibold bg-red-500 px-2 py-1 rounded">
                Hết hàng
              </span>
            </div>
          )}
        </div>
      </a>
      <div className="p-2.5 flex flex-col flex-1">
        <a
          href={`/products/${product.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-gray-800 line-clamp-2 hover:text-blue-600 transition-colors leading-snug"
        >
          {product.name}
        </a>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500">
          <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
            {product.brandName}
          </span>
          {product.shopName && (
            <span className="truncate">{product.shopName}</span>
          )}
        </div>
        <div className="mt-auto pt-2">
          <p className="text-sm font-bold text-red-600">
            {formatPrice(product.price)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-gray-600">
                {product.averageScore.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-gray-400">|</span>
            <span className="text-[10px] text-gray-500">
              Đã bán {product.soldOut}
            </span>
          </div>
        </div>
        {onAddToCart && product.isInStock && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product.id);
            }}
            className="mt-2 w-full flex items-center justify-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-medium py-1.5 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all active:scale-95"
          >
            <ShoppingCart className="w-3 h-3" />
            Thêm vào giỏ
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  Product Carousel
// ══════════════════════════════════════════

function ProductCarousel({
  products,
  onAddToCart,
}: {
  products: ChatProduct[];
  onAddToCart?: (id: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollButtons();
  }, [products, updateScrollButtons]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === "left" ? -220 : 220,
      behavior: "smooth",
    });
    setTimeout(updateScrollButtons, 400);
  };

  if (!products.length) return null;

  return (
    <div className="relative mt-2 group">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-md rounded-full p-1 hover:bg-white transition-opacity opacity-0 group-hover:opacity-100"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}
      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-md rounded-full p-1 hover:bg-white transition-opacity opacity-0 group-hover:opacity-100"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((p) => (
          <div key={p.id} className="snap-start">
            <ProductCard product={p} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  Suggestion Chips
// ══════════════════════════════════════════

function SuggestionChips({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (s: string) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-xs bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full border border-violet-100 hover:bg-violet-100 hover:border-violet-200 transition-all active:scale-95 cursor-pointer shadow-sm hover:shadow"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════
//  Typing Indicator
// ══════════════════════════════════════════

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2 px-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400 ml-1">Đang suy nghĩ...</span>
    </div>
  );
}

// ══════════════════════════════════════════
//  Coupon Card
// ══════════════════════════════════════════

function CouponCard({ coupon }: { coupon: ChatCoupon }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
        <Tag className="w-4 h-4 text-green-600" />
        <span className="font-bold text-green-700 text-sm">{coupon.code}</span>
      </div>
      <p className="text-xs text-gray-700">{coupon.name}</p>
      <p className="text-xs font-semibold text-green-600 mt-1">
        Giảm {coupon.discount}
      </p>
      {coupon.minOrder > 0 && (
        <p className="text-[10px] text-gray-500">
          Đơn tối thiểu {formatPrice(coupon.minOrder)}
        </p>
      )}
      <button
        onClick={() => {
          navigator.clipboard.writeText(coupon.code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-2 text-[10px] font-medium text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-full transition-colors"
      >
        {copied ? "Đã sao chép ✓" : "Sao chép mã"}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
//  Main Widget
// ══════════════════════════════════════════

export default function ChatBotWidget() {
  // ── State ──
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [coupons, setCoupons] = useState<ChatCoupon[]>([]);

  // Voice input
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Load persisted history ──
  useEffect(() => {
    const saved = loadChatHistory();
    if (saved && saved.length > 0) {
      setMessages(saved);
    }
  }, []);

  // ── Save history on change ──
  useEffect(() => {
    if (messages.length > 1) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // ── Scroll detect ──
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollDown(!atBottom);
  }, []);

  // ── Focus input when opened ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnreadCount(0);
    }
  }, [isOpen]);

  // ── Build history for API ──
  const apiHistory = useMemo(() => {
    return messages
      .filter((m) => !m.isStreaming)
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));
  }, [messages]);

  // ══════════════════════════════════════════
  //  Voice Input (Web Speech API)
  // ══════════════════════════════════════════

  const startVoiceInput = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionAPI = w.SpeechRecognition || w.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "vi-VN";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);

      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
      }
    };

    recognition.onerror = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ══════════════════════════════════════════
  //  Send message (streaming)
  // ══════════════════════════════════════════

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    // Placeholder assistant message for streaming
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);

    // Auto-resize textarea back
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let fullContent = "";
    let products: ChatProduct[] = [];
    let suggestions: string[] = [];
    let actions: any[] = [];
    let citations: any[] = [];

    try {
      await streamChatMessageV2(
        text,
        apiHistory,
        {
          onToken: (token) => {
            fullContent += token;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: fullContent,
                };
              }
              return updated;
            });
          },
          onProducts: (p) => {
            products = p;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, products: p };
              }
              return updated;
            });
          },
          onSuggestions: (s) => {
            suggestions = s;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, suggestions: s };
              }
              return updated;
            });
          },
          onActions: (a) => {
            actions = a;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, actions: a };
              }
              return updated;
            });
          },
          onCitations: (c) => {
            citations = c;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, citations: c };
              }
              return updated;
            });
          },
          onIntent: () => {
            // Could show intent indicator
          },
          onCleanReply: (reply) => {
            fullContent = reply;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: reply,
                };
              }
              return updated;
            });
          },
          onDone: () => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  isStreaming: false,
                  products,
                  suggestions,
                  actions,
                  citations,
                };
              }
              return updated;
            });
            if (soundEnabled && !isOpen) playNotificationSound();
            if (!isOpen) setUnreadCount((c) => c + 1);
          },
          onError: (msg) => {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content:
                    msg || "Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.",
                  isStreaming: false,
                };
              }
              return updated;
            });
          },
        },
        abortController.signal
      );
    } catch {
      // Fallback to non-streaming
      try {
        const res = await sendChatMessage(text, apiHistory);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content:
                res.data?.reply ||
                res.message ||
                "Xin lỗi, đã có lỗi xảy ra.",
              products: res.data?.products,
              suggestions: res.data?.suggestions,
              isStreaming: false,
            };
          }
          return updated;
        });
      } catch {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: "Không thể kết nối đến chatbot. Vui lòng thử lại sau.",
              isStreaming: false,
            };
          }
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, apiHistory, soundEnabled, isOpen]);

  // ── Send via suggestion click ──
  const handleSuggestionClick = useCallback(
    (text: string) => {
      setInput(text);
      // Use timeout to let the input update first
      setTimeout(() => {
        const fakeEvent = { trim: () => text } as unknown;
        void (async () => {
          const userMsg: ChatMessage = {
            role: "user",
            content: text,
            timestamp: new Date(),
          };
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isStreaming: true,
          };
          setMessages((prev) => [...prev, userMsg, assistantMsg]);
          setInput("");
          setIsLoading(true);

          const abortController = new AbortController();
          abortControllerRef.current = abortController;

          let fullContent = "";
          let products: ChatProduct[] = [];
          let suggestions: string[] = [];
          let actions: any[] = [];
          let citations: any[] = [];

          try {
            await streamChatMessageV2(
              text,
              apiHistory,
              {
                onToken: (token) => {
                  fullContent += token;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = { ...last, content: fullContent };
                    }
                    return updated;
                  });
                },
                onProducts: (p) => {
                  products = p;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = { ...last, products: p };
                    }
                    return updated;
                  });
                },
                onSuggestions: (s) => {
                  suggestions = s;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = { ...last, suggestions: s };
                    }
                    return updated;
                  });
                },
                onActions: (a) => {
                  actions = a;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = { ...last, actions: a };
                    }
                    return updated;
                  });
                },
                onCitations: (c) => {
                  citations = c;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = { ...last, citations: c };
                    }
                    return updated;
                  });
                },
                onIntent: () => {},
                onCleanReply: (reply) => {
                  fullContent = reply;
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = { ...last, content: reply };
                    }
                    return updated;
                  });
                },
                onDone: () => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        isStreaming: false,
                        products,
                        suggestions,
                        actions,
                        citations,
                      };
                    }
                    return updated;
                  });
                  if (soundEnabled) playNotificationSound();
                },
                onError: (msg) => {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: msg || "Xin lỗi, đã có lỗi xảy ra.",
                        isStreaming: false,
                      };
                    }
                    return updated;
                  });
                },
              },
              abortController.signal
            );
          } catch {
            // fallback handled inside
          } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
          }
        })();
      }, 50);
    },
    [apiHistory, soundEnabled]
  );

  // ── Keyboard ──
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Textarea auto-resize ──
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  // ── Clear chat ──
  const handleClear = () => {
    setMessages([GREETING_MESSAGE]);
    clearChatHistory();
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  // ── Add to cart ──
  const handleAddToCart = useCallback(async (productId: number) => {
    // Dynamic import to avoid issues if CartContext not available
    try {
      const { toast } = await import("sonner");
      // Attempt to use cart API directly
      const { cartService } = await import("@/lib/services/cart-service");
      const success = await cartService.addToCart({ productId, quantity: 1 });
      if (success) {
        toast.success("Đã thêm vào giỏ hàng!");
      } else {
        toast.error("Không thể thêm vào giỏ. Vui lòng đăng nhập.");
      }
    } catch {
      const { toast } = await import("sonner");
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
    }
  }, []);

  // ── Toggle ──
  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) setUnreadCount(0);
  };

  // ── Widget dimensions ──
  const widgetClasses = isFullscreen
    ? "fixed inset-0 z-[9999]"
    : "fixed bottom-20 right-4 z-[9999] w-[400px] h-[600px] max-h-[80vh] sm:w-[420px]";

  // ══════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════

  return (
    <>
      {/* ── Floating Button ── */}
      {!isOpen && (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white shadow-[0_8px_24px_rgba(139,92,246,0.4)] hover:shadow-[0_12px_28px_rgba(139,92,246,0.6)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
          aria-label="Mở chatbot"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse shadow-md">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-[#8b5cf6] opacity-30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
        </button>
      )}

      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className={`${widgetClasses} flex flex-col bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_20px_40px_-10px_rgba(139,92,246,0.15),0_0_0_1px_rgba(139,92,246,0.05)] border border-white/50 overflow-hidden`}
          style={{
            animation: isFullscreen ? undefined : "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-[#8b5cf6]/10 to-[#d946ef]/10 border-b border-[#8b5cf6]/10 px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#d946ef] flex items-center justify-center shadow-md text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-slate-800">Trợ lý ShopTTS AI</h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium mt-0.5">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500"></span>
                </span>
                Sẵn sàng hỗ trợ
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* Sound toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                title={soundEnabled ? "Tắt âm" : "Bật âm"}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
              {/* Fullscreen toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all hidden sm:block"
                title={isFullscreen ? "Thu nhỏ" : "Phóng to"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              {/* Clear */}
              <button
                onClick={handleClear}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Xóa cuộc trò chuyện"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* Close */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all ml-1"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 px-4 py-2.5 bg-slate-50/50 backdrop-blur-md border-b border-slate-100 overflow-x-auto shrink-0 scrollbar-hide">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(action.message)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white rounded-full text-xs font-medium text-slate-600 border border-slate-200 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50 hover:shadow-sm transition-all whitespace-nowrap disabled:opacity-50 shrink-0"
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            ))}
          </div>

          {/* ── Messages ── */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-5 space-y-5"
            style={{ scrollBehavior: "smooth" }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
                style={{
                  animation: 'message-slide-up 0.3s ease-out forwards'
                }}
              >
                <div
                  className={`max-w-[85%] relative ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-md"
                      : "bg-white text-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
                  }`}
                >
                  {/* Message content */}
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-1.5 prose-strong:text-slate-900 prose-a:text-violet-600 hover:prose-a:text-violet-700 text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-4 bg-violet-500 ml-1 animate-pulse rounded-full align-middle" />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}

                  {/* Products carousel */}
                  {msg.products && msg.products.length > 0 && (
                    <ProductCarousel
                      products={msg.products}
                      onAddToCart={handleAddToCart}
                    />
                  )}

                  {/* Suggestions */}
                  {msg.suggestions &&
                    msg.suggestions.length > 0 &&
                    !msg.isStreaming && (
                      <SuggestionChips
                        suggestions={msg.suggestions}
                        onSelect={handleSuggestionClick}
                      />
                    )}

                  {/* Actions (from structured JSON) */}
                  {msg.actions && msg.actions.length > 0 && !msg.isStreaming && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.actions.map((act, i) => {
                        const key = `action-${i}`;
                        if (act?.type === 'add_to_cart' && act.productId) {
                          return (
                            <button
                              key={key}
                              onClick={() => handleAddToCart(act.productId)}
                              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-full hover:bg-green-700 transition-all"
                            >
                              Thêm vào giỏ
                            </button>
                          );
                        }
                        if (act?.type === 'view' && act.productId) {
                          return (
                            <a
                              key={key}
                              href={`/products/${act.productId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 hover:bg-blue-100 transition-all"
                            >
                              Xem chi tiết
                            </a>
                          );
                        }
                        if (act?.url) {
                          return (
                            <a
                              key={key}
                              href={act.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs bg-gray-50 text-gray-700 px-3 py-1.5 rounded-full border border-gray-100 hover:bg-gray-100 transition-all"
                            >
                              {act.label || 'Mở liên kết'}
                            </a>
                          );
                        }
                        return (
                          <button key={key} className="text-xs bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full">
                            {act?.label || 'Hành động'}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      {msg.citations.map((c, i) => (
                        <div key={i}>
                          <a href={c.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            {c.title || c.source || c.url}
                          </a>
                          {c.source && <span className="ml-2 text-gray-400">({c.source})</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timestamp */}
                  <p
                    className={`text-[10px] mt-2 font-medium ${
                      msg.role === "user"
                        ? "text-violet-100"
                        : "text-slate-400"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading &&
              messages[messages.length - 1]?.content === "" &&
              messages[messages.length - 1]?.isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 rounded-2xl rounded-bl-md px-3 py-2 border border-gray-100">
                    <TypingIndicator />
                  </div>
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Scroll down button ── */}
          {showScrollDown && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full p-2 border border-gray-200 hover:bg-gray-50 transition-all z-10"
            >
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {/* ── Input Area ── */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 backdrop-blur-md shrink-0">
            <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-50 transition-all">
              {/* Voice button */}
              <button
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={`p-2 rounded-xl transition-all shrink-0 flex-none ${
                  isListening
                    ? "bg-rose-100 text-rose-600 animate-pulse"
                    : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                }`}
                title={isListening ? "Dừng ghi âm" : "Nhập bằng giọng nói"}
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>

              {/* Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening
                      ? "Đang nghe..."
                      : "Hỏi ShopTTS Assistant..."
                  }
                  rows={1}
                  className="w-full resize-none bg-transparent border-none px-2 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 transition-all"
                  style={{ maxHeight: "120px" }}
                  disabled={isLoading}
                />
              </div>

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white flex items-center justify-center hover:from-[#7c3aed] hover:to-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0 flex-none shadow-sm shadow-violet-200"
                title="Gửi tin nhắn"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 ml-0.5" />
                )}
              </button>
            </div>

            {/* Voice listening indicator */}
            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
                <span className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1 bg-red-400 rounded-full animate-pulse"
                      style={{
                        height: `${8 + Math.random() * 12}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </span>
                Đang nghe giọng nói...
              </div>
            )}
          </div>

          {/* ── Powered by ── */}
          <div className="text-center text-[9px] text-gray-400 py-1 bg-gray-50 border-t border-gray-50 shrink-0">
            Powered by ShopTTS AI ✨ Llama 3.3-70B
          </div>
        </div>
      )}

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes message-slide-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
