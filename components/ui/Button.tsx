import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

const styles = {
  primary: 'bg-moss text-white hover:bg-[#405d49]',
  secondary: 'border border-line bg-white text-ink hover:bg-[#eef2ee]',
  danger: 'bg-coral text-white hover:bg-[#ad5042]',
  ghost: 'text-ink hover:bg-[#eef2ee]'
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
