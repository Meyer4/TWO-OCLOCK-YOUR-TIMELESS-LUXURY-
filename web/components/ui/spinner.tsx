export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-stone">
      <span className="h-3 w-3 animate-spin rounded-full border border-gold border-t-transparent" aria-hidden />
      {label}
    </span>
  );
}
