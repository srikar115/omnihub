import { motion } from 'framer-motion';

export default function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  gradient = 'from-cyan-500 to-blue-600',
  onClick,
  delay = 0 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 cursor-pointer hover:border-[#2a2c35] transition-all group"
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-10 flex items-center justify-center mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <p className="text-4xl font-bold mb-1">{value}</p>
      <p className="text-sm text-[#6b7280]">{label}</p>
    </motion.div>
  );
}
