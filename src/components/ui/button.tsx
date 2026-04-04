import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'cta';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-seat-red focus-visible:ring-offset-2 focus-visible:ring-offset-seat-black disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-seat-red text-white hover:bg-seat-red-dark active:bg-rose-800 rounded-lg shadow-sm': variant === 'primary',
            'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 rounded-lg': variant === 'secondary',
            'text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg': variant === 'ghost',
            'bg-seat-red text-white font-semibold hover:bg-seat-red-dark active:bg-rose-800 rounded-lg shadow-sm': variant === 'cta',
          },
          {
            'h-8 px-3 text-xs gap-1.5': size === 'sm',
            'h-9 px-4 text-sm gap-2': size === 'md',
            'h-10 px-5 text-sm gap-2': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
