export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink">
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-paper/50">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-confirmed opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-confirmed" />
        </span>
        Loading
      </span>
    </div>
  );
}
