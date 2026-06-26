import React from 'react';

interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 4 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-slate-200 dark:bg-slate-700 rounded-2xl aspect-square mb-3"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}
