import { Copy, Radio } from "lucide-react";

export default function ProgressHeader({ roomCode, roundNumber, maxRounds }) {
  const progress = maxRounds ? Math.round((roundNumber / maxRounds) * 100) : 0;

  async function copyCode() {
    if (navigator.clipboard && roomCode) {
      await navigator.clipboard.writeText(roomCode);
    }
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
          <Radio size={18} className="text-cyan" aria-hidden="true" />
          <span>
            Round {roundNumber}/{maxRounds}
          </span>
        </div>
        <button
          className="focus-ring touch-target inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 text-sm font-semibold text-white/80"
          onClick={copyCode}
          type="button"
          aria-label="Copy room code"
          title="Copy room code"
        >
          <Copy size={16} aria-hidden="true" />
          <span>{roomCode}</span>
        </button>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan via-emerald to-violet transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
