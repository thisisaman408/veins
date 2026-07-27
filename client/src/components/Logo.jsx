import { motion } from "framer-motion";

export default function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="text-center text-5xl font-semibold tracking-[0.22em] text-white sm:text-7xl">
        VERITAS
      </div>
      <div className="hairline h-px w-56 sm:w-80" />
    </motion.div>
  );
}
