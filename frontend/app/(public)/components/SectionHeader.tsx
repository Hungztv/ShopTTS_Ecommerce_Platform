import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  href?: string;
}

export function SectionHeader({ icon: Icon, iconColor, title, subtitle, href }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="hidden sm:flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
        >
          Xem tất cả
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}
