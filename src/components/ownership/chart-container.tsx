export function ChartContainer({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-t-border bg-t-surface p-4">
      <h3 className="font-mono text-[13px] font-semibold tracking-tight text-t-text">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-t-text-muted">{subtitle}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}
