export function AuthDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/80" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-card/90 px-3 text-muted-foreground">or</span>
      </div>
    </div>
  );
}
