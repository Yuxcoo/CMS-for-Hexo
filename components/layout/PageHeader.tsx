export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-[-0.28px] text-ink sm:text-[56px] sm:leading-[1.07]">{title}</h1>
        {description ? <p className="mt-3 text-[21px] font-normal leading-[1.35] tracking-[0.196px] text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
