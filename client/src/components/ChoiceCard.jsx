import { motion } from "framer-motion";

export default function ChoiceCard({ option, index, selected, disabled, onSelect }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: disabled ? 1 : 0.99 }}
      whileHover={{ y: disabled ? 0 : -1 }}
      onClick={() => !disabled && onSelect(index)}
      disabled={disabled}
      className={`focus-ring touch-target w-full rounded-lg border p-4 text-left transition ${
        selected
          ? "border-cyan bg-cyan/12 shadow-glow"
          : "border-white/10 bg-white/[0.045] hover:border-white/22 hover:bg-white/[0.07]"
      } disabled:cursor-not-allowed disabled:opacity-70`}
    >
      <div className="flex gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
            selected ? "border-cyan bg-cyan text-jet" : "border-white/16 text-white/70"
          }`}
        >
          {index + 1}
        </span>
        <span className="text-sm leading-6 text-white/88 sm:text-base">{option}</span>
      </div>
    </motion.button>
  );
}
