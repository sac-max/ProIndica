import React from 'react';
import { ShieldCheck, Crown, Zap, CheckCircle2 } from 'lucide-react';

interface BadgeProps {
  type: 'verified' | 'premium' | 'top_rated' | 'most_hired';
  size?: 'sm' | 'md' | 'lg';
}

export const ProfessionalBadge: React.FC<BadgeProps> = ({ type, size = 'md' }) => {
  const configs = {
    verified: {
      icon: ShieldCheck,
      text: 'Verificado',
      className: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    premium: {
      icon: Crown,
      text: 'Premium',
      className: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    top_rated: {
      icon: Zap,
      text: 'Destaque',
      className: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    most_hired: {
      icon: CheckCircle2,
      text: 'Mais Contratado',
      className: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    }
  };

  const { icon: Icon, text, className } = configs[type];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[9px] gap-1',
    md: 'px-2.5 py-1 text-[10px] gap-1.5',
    lg: 'px-3 py-1.5 text-xs gap-2',
  };

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  };

  return (
    <div className={`inline-flex items-center font-black uppercase tracking-widest border rounded-full ${className} ${sizeClasses[size]}`}>
      <Icon size={iconSizes[size]} className="stroke-[3]" />
      <span>{text}</span>
    </div>
  );
};
