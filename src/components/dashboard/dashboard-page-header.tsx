import type { ReactNode } from "react";

export function DashboardPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-[family-name:var(--font-display-marketing)] text-3xl font-medium tracking-tight text-[oklch(0.2_0.045_260)] sm:text-[2rem] sm:leading-tight">
          {title}
        </h1>
        {description != null && description !== "" ? (
          <div className="mt-2 max-w-2xl text-[oklch(0.42_0.03_260)]">{description}</div>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
