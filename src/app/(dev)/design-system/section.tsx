export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border-t border-border pt-8">
      <h2 className="eyebrow">{title}</h2>
      {children}
    </section>
  );
}
