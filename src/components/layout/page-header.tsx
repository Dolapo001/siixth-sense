import { cn } from "@/lib/utilities/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex flex-col gap-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-title font-semibold">{title}</h1>
        {description && <p className="max-w-2xl text-body text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

/** Standard width and padding for non-map platform pages. */
export function PageContainer({
  children,
  className,
  ref,
}: {
  children: React.ReactNode;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={cn("mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8", className)}>
      {children}
    </div>
  );
}
