import { motion } from "framer-motion";

export default function Logo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2 max-w-full px-2"
    >
      <div className="text-center text-3xl font-semibold tracking-[0.16em] text-white sm:text-6xl sm:tracking-[0.22em] max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
        VERITAS
      </div>
      <div className="hairline h-px w-36 sm:w-72 max-w-full" />
    </motion.div>
  );
}
