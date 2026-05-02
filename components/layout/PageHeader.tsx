export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="font-display text-[30px] font-semibold leading-[1.12] tracking-[-0.28px] text-ink sm:text-[38px]">{title}</h1>
        {description ? <p className="mt-2 text-[16px] font-normal leading-[1.45] tracking-[-0.18px] text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
