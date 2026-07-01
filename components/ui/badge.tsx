import * as React from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-[0.7rem] font-black text-zinc-600', className)}
      {...props}
    />
  );
}
