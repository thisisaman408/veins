export default function TruthLieToggle({ isLie, onChange, disabled = false, truthLabel = "Truth", lieLabel = "Lie" }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-black/22 p-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`focus-ring touch-target rounded-md px-4 py-3 text-sm font-semibold transition ${
          !isLie ? "bg-emerald text-jet shadow-[0_0_28px_rgba(16,185,129,0.22)]" : "text-white/60 hover:text-white"
        } disabled:cursor-not-allowed`}
      >
        {truthLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`focus-ring touch-target rounded-md px-4 py-3 text-sm font-semibold transition ${
          isLie ? "bg-danger text-white shadow-[0_0_28px_rgba(244,63,94,0.24)]" : "text-white/60 hover:text-white"
        } disabled:cursor-not-allowed`}
      >
        {lieLabel}
      </button>
    </div>
  );
}
