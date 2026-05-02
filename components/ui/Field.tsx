import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold leading-[1.29] tracking-[-0.224px] text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`min-h-11 rounded-full border border-line bg-canvas px-5 py-3 text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-ink outline-none transition placeholder:text-muted focus:border-blueFocus focus:ring-2 focus:ring-blueFocus/20 disabled:bg-paper disabled:text-muted ${className}`} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`min-h-40 rounded-[18px] border border-line bg-canvas px-5 py-4 text-[17px] font-normal leading-[1.47] tracking-[-0.374px] text-ink outline-none transition placeholder:text-muted focus:border-blueFocus focus:ring-2 focus:ring-blueFocus/20 disabled:bg-paper disabled:text-muted ${className}`} {...rest} />;
}
