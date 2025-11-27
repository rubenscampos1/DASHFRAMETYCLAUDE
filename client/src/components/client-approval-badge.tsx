import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface ClientApprovalBadgeProps {
  approvalCount: number;
}

/**
 * Badge de notificação de aprovações do cliente
 * Mostra um sininho com contador quando há aprovações
 */
export function ClientApprovalBadge({ approvalCount }: ClientApprovalBadgeProps) {
  if (approvalCount === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className="relative"
    >
      <Badge
        className="
          bg-green-500 hover:bg-green-600
          text-white
          px-2 py-1
          rounded-full
          shadow-lg
          flex items-center gap-1.5
          cursor-pointer
          transition-all duration-200
          hover:scale-105
        "
      >
        <Bell className="w-3.5 h-3.5 animate-pulse" />
        <span className="text-xs font-semibold">{approvalCount}</span>
      </Badge>

      {/* Efeito de pulso */}
      <span className="absolute -inset-0.5 bg-green-400 rounded-full opacity-30 animate-ping" />
    </motion.div>
  );
}
