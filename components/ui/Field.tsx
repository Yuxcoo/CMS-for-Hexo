import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`min-h-10 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-moss ${className}`} {...rest} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', ...rest } = props;
  return <textarea className={`min-h-40 rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-moss ${className}`} {...rest} />;
}
