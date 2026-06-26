import React from 'react';
import { ProductGridSkeleton } from './components/ProductGridSkeleton';

export default function Loading() {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Skeleton for Hero Banner */}
      <div className="w-full h-64 md:h-96 bg-slate-200 dark:bg-slate-800 animate-pulse mb-8" />
      
      {/* Skeleton for Category Nav */}
      <div className="max-w-7xl mx-auto px-4 mb-10 flex gap-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-6 animate-pulse" />
        <ProductGridSkeleton count={5} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/4 mb-6 animate-pulse" />
        <ProductGridSkeleton count={5} />
      </div>
    </div>
  );
}
