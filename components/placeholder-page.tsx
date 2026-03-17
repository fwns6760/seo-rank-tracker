type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <section className="rounded-[2rem] border border-dashed border-border bg-card/70 p-8">
      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
        {description}
      </p>
    </section>
  );
}

