import { Copy, Radio, LogOut } from "lucide-react";
import { useState } from "react";

export default function ProgressHeader({ roomCode, roundNumber, maxRounds, onExit }) {
  const progress = maxRounds ? Math.round((roundNumber / maxRounds) * 100) : 0;
  const [confirmExit, setConfirmExit] = useState(false);

  async function copyCode() {
    if (navigator.clipboard && roomCode) {
      await navigator.clipboard.writeText(roomCode);
    }
  }

  function handleExit() {
    if (confirmExit) {
      onExit?.();
    } else {
      setConfirmExit(true);
      // Auto-reset confirmation after 4s if user doesn't click again
      setTimeout(() => setConfirmExit(false), 4000);
    }
  }

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left — subtle exit */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExit}
            type="button"
            aria-label="Leave game"
            title={confirmExit ? "Click again to confirm exit" : "Leave game"}
            className={`focus-ring touch-target inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-300 ${
              confirmExit
                ? "border-danger/60 bg-danger/15 text-danger animate-pulse"
                : "border-white/8 bg-transparent text-white/25 hover:border-white/20 hover:text-white/50"
            }`}
          >
            <LogOut size={13} aria-hidden="true" />
            <span>{confirmExit ? "Sure?" : "Exit"}</span>
          </button>

          <div className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <Radio size={18} className="text-cyan" aria-hidden="true" />
            <span>Round {roundNumber}/{maxRounds}</span>
          </div>
        </div>

        {/* Right — room code copy */}
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

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan via-emerald to-violet transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </header>
  );
}
