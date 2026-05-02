import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

const styles = {
  primary: 'bg-blue text-white hover:bg-blueFocus focus-visible:outline-blueFocus',
  secondary: 'border border-blue bg-transparent text-blue hover:bg-blue hover:text-white focus-visible:outline-blueFocus',
  danger: 'bg-danger text-white hover:bg-[#8f1d14] focus-visible:outline-danger',
  ghost: 'text-ink hover:bg-paper focus-visible:outline-blueFocus'
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-[15px] font-normal leading-none tracking-[-0.18px] transition duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
