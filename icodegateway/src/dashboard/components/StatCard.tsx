import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function StatCard({ label, value, suffix, icon, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 p-5 ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-800">
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix && <span className="text-lg font-normal text-slate-400 ml-1">{suffix}</span>}
          </p>
        </div>
        {icon && (
          <div className="text-slate-300">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
