export default function ActionButton({ children, icon: Icon, variant = "primary", className = "", ...props }) {
  const variants = {
    primary:
      "bg-cyan text-jet shadow-glow hover:bg-cyan/90 disabled:bg-white/10 disabled:text-white/40",
    secondary:
      "border border-white/12 bg-white/8 text-white hover:border-cyan/60 hover:bg-cyan/10 disabled:text-white/40",
    danger:
      "border border-danger/60 bg-danger/15 text-white shadow-[0_0_32px_rgba(244,63,94,0.18)] hover:bg-danger/25"
  };

  return (
    <button
      className={`focus-ring touch-target inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" size={18} /> : null}
      <span>{children}</span>
    </button>
  );
}
