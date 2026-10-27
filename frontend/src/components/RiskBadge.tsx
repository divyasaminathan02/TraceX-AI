import React from 'react';

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  score,
  showScore = false,
  size = 'md',
}) => {
  const normLevel = (level || 'LOW').toUpperCase();

  const getStyles = () => {
    switch (normLevel) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'HIGH':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const getDotColor = () => {
    switch (normLevel) {
      case 'CRITICAL':
        return 'bg-red-500 animate-pulse';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-amber-500';
      case 'LOW':
      default:
        return 'bg-emerald-500';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors ${getStyles()} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      <span>{normLevel}</span>
      {showScore && score !== undefined && (
        <span className="font-mono text-[10px] opacity-80 pl-1 border-l border-current/20">
          {(score * 100).toFixed(1)}%
        </span>
      )}
    </span>
  );
};
