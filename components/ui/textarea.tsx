import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none transition-colors focus:border-cyan-600',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
