import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5266/api';

// ══════════════════════════════════════════
//  Types
// ══════════════════════════════════════════

export enum BehaviorType {
  View = 0,
  Search = 1,
  AddToCart = 2,
  Purchase = 3,
  Wishlist = 4,
  Rating = 5,
  Compare = 6,
}

export interface TrackEvent {
  sessionId?: string;
  behaviorType: BehaviorType;
  productId?: number;
  searchQuery?: string;
  ratingScore?: number;
  dwellTimeSeconds?: number;
  sourcePage?: string;
}

export interface RecommendedProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  capitalPrice?: number;
  image: string;
  brandName: string;
  categoryName: string;
  categoryId?: number;
  brandId?: number;
  averageScore: number;
  ratingCount: number;
  soldOut: number;
  isInStock: boolean;
  shortDescription?: string;
  highlightBadge?: string;
}

export interface PersonalizedHomeFeed {
  recommendedForYou: RecommendedProduct[];
  flashSale: RecommendedProduct[];
  newArrivals: RecommendedProduct[];
  trending: RecommendedProduct[];
  recentlyViewed: RecommendedProduct[];
  preferredCategories: string[];
  hasPersonalizedData: boolean;
}

// ══════════════════════════════════════════
//  Session ID management
// ══════════════════════════════════════════

const SESSION_KEY = 'shoptts_session_id';

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    try {
      localStorage.setItem(SESSION_KEY, sessionId);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    } catch {
      // Ignore storage errors in private browsing
    }
  }
  return sessionId;
}

// ══════════════════════════════════════════
//  Auth token helper
// ══════════════════════════════════════════

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// ══════════════════════════════════════════
//  Tracking functions
// ══════════════════════════════════════════

// Queue for batching events
let eventQueue: TrackEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 1500; // 1.5 seconds
const MAX_BATCH_SIZE = 15;

/**
 * Track a single behavior event. Critical events flush immediately.
 */
export function trackBehavior(event: Omit<TrackEvent, 'sessionId'>, immediate = false): void {
  const fullEvent: TrackEvent = {
    ...event,
    sessionId: getSessionId(),
  };

  eventQueue.push(fullEvent);

  // Flush immediately if requested or batch is full
  if (immediate || eventQueue.length >= MAX_BATCH_SIZE) {
    flushEvents();
    return;
  }

  // Schedule flush
  if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, FLUSH_INTERVAL);
  }
}

/**
 * Flush all queued events to the API
 */
async function flushEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    if (eventsToSend.length === 1) {
      await axios.post(`${API_URL}/behavior/track`, eventsToSend[0], {
        headers: getAuthHeaders(),
      });
    } else {
      await axios.post(
        `${API_URL}/behavior/track-batch`,
        {
          sessionId: getSessionId(),
          events: eventsToSend,
        },
        { headers: getAuthHeaders() }
      );
    }
  } catch (error) {
    // Silently fail — tracking should never block UX
    console.warn('[Behavior] Failed to send tracking events:', error);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      const body = JSON.stringify(
        eventQueue.length === 1
          ? eventQueue[0]
          : { sessionId: getSessionId(), events: eventQueue }
      );
      const url =
        eventQueue.length === 1
          ? `${API_URL}/behavior/track`
          : `${API_URL}/behavior/track-batch`;

      // Use sendBeacon for reliable delivery on page unload
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      eventQueue = [];
    }
  });
}

// ══════════════════════════════════════════
//  Convenience tracking helpers
// ══════════════════════════════════════════

/** Track a product page view (flushed immediately so recommendations react fast) */
export function trackProductView(productId: number, sourcePage?: string): void {
  trackBehavior({
    behaviorType: BehaviorType.View,
    productId,
    sourcePage: sourcePage || (typeof window !== 'undefined' ? window.location.pathname : undefined),
  }, true);
}

/** Track a search query (flushed immediately) */
export function trackSearch(query: string, sourcePage?: string): void {
  if (!query || !query.trim()) return;
  trackBehavior({
    behaviorType: BehaviorType.Search,
    searchQuery: query.trim(),
    sourcePage: sourcePage || 'search',
  }, true);
}

/** Track an add-to-cart action */
export function trackAddToCart(productId: number, sourcePage?: string): void {
  trackBehavior({
    behaviorType: BehaviorType.AddToCart,
    productId,
    sourcePage: sourcePage || window?.location?.pathname,
  });
}

/** Track a purchase (call for each product in the order) */
export function trackPurchase(productId: number): void {
  trackBehavior({
    behaviorType: BehaviorType.Purchase,
    productId,
    sourcePage: 'checkout',
  });
}

/** Track adding to wishlist */
export function trackWishlist(productId: number): void {
  trackBehavior({
    behaviorType: BehaviorType.Wishlist,
    productId,
    sourcePage: window?.location?.pathname,
  });
}

/** Track a product rating */
export function trackRating(productId: number, score: number): void {
  trackBehavior({
    behaviorType: BehaviorType.Rating,
    productId,
    ratingScore: score,
    sourcePage: window?.location?.pathname,
  });
}

/** Track adding to comparison */
export function trackCompare(productId: number): void {
  trackBehavior({
    behaviorType: BehaviorType.Compare,
    productId,
    sourcePage: window?.location?.pathname,
  });
}

/**
 * Track dwell time on a product page.
 * Call this when leaving the product page with the elapsed seconds.
 */
export function trackDwellTime(productId: number, seconds: number): void {
  trackBehavior({
    behaviorType: BehaviorType.View,
    productId,
    dwellTimeSeconds: Math.round(seconds),
    sourcePage: window?.location?.pathname,
  });
}

// ══════════════════════════════════════════
//  Recommendation fetching
// ══════════════════════════════════════════

export async function getPersonalizedRecommendations(
  limit = 8
): Promise<RecommendedProduct[]> {
  try {
    const res = await axios.get(`${API_URL}/behavior/recommendations`, {
      params: { sessionId: getSessionId(), limit },
      headers: getAuthHeaders(),
    });
    return res.data?.data || [];
  } catch {
    return [];
  }
}

export async function getRecentlyViewed(limit = 8): Promise<RecommendedProduct[]> {
  try {
    const res = await axios.get(`${API_URL}/behavior/recently-viewed`, {
      params: { sessionId: getSessionId(), limit },
      headers: getAuthHeaders(),
    });
    return res.data?.data || [];
  } catch {
    return [];
  }
}

export async function getBoughtTogether(
  productId: number,
  limit = 5
): Promise<RecommendedProduct[]> {
  try {
    const res = await axios.get(`${API_URL}/behavior/bought-together/${productId}`, {
      params: { limit },
      headers: getAuthHeaders(),
    });
    return res.data?.data || [];
  } catch {
    return [];
  }
}

export async function getAlsoViewed(
  productId: number,
  limit = 5
): Promise<RecommendedProduct[]> {
  try {
    const res = await axios.get(`${API_URL}/behavior/also-viewed/${productId}`, {
      params: { limit },
      headers: getAuthHeaders(),
    });
    return res.data?.data || [];
  } catch {
    return [];
  }
}

/**
 * Get dynamic, personalized home feed for all sections
 */
export async function getHomeFeed(limit = 8): Promise<PersonalizedHomeFeed | null> {
  try {
    const res = await axios.get(`${API_URL}/behavior/home-feed`, {
      params: { sessionId: getSessionId(), limit },
      headers: getAuthHeaders(),
    });
    return res.data?.data || null;
  } catch (error) {
    console.warn('[Behavior] Failed to fetch home feed:', error);
    return null;
  }
}
