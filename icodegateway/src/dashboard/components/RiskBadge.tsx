import React from 'react';

type RiskLevel = 'low' | 'medium' | 'high';

interface RiskBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

const riskConfig: Record<RiskLevel, { emoji: string; bg: string; text: string; label: string }> = {
  low: {
    emoji: '🟢',
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: '低',
  },
  medium: {
    emoji: '🟡',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: '中',
  },
  high: {
    emoji: '🔴',
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: '高',
  },
};

export default function RiskBadge({ level, showLabel = true, size = 'md' }: RiskBadgeProps) {
  const config = riskConfig[level];
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${sizeClass}`}>
      <span>{config.emoji}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

export { riskConfig };
export type { RiskLevel };
