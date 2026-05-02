import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold leading-[1.3] tracking-[-0.12px] text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(props, ref) {
  const { className = '', ...rest } = props;
  return <input ref={ref} className={`min-h-10 rounded-full border border-line bg-canvas px-4 py-2 text-[15px] font-normal leading-[1.45] tracking-[-0.18px] text-ink outline-none transition placeholder:text-muted focus:border-blueFocus focus:ring-2 focus:ring-blueFocus/20 disabled:bg-paper disabled:text-muted ${className}`} {...rest} />;
});

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`min-h-32 rounded-[14px] border border-line bg-canvas px-4 py-3 text-[15px] font-normal leading-[1.5] tracking-[-0.18px] text-ink outline-none transition placeholder:text-muted focus:border-blueFocus focus:ring-2 focus:ring-blueFocus/20 disabled:bg-paper disabled:text-muted ${className}`} {...rest} />;
}
