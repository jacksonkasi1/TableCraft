import React from 'react';
import { cn } from '../lib/utils';

export const LiquidCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn("liquid-glass rounded-2xl", className)} {...props}>
      {children}
    </div>
  );
};