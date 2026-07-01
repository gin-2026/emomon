import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold outline-none transition-colors focus:border-cyan-600',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
