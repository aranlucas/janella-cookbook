export function Footer() {
  return (
    <footer className="border-butter bg-warm-white border-t">
      <div className="container py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-muted-foreground text-sm">
            Your personal recipe collection
          </p>
          <p className="text-muted-foreground text-sm">
            Built with love for home cooks everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
