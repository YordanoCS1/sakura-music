import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music } from 'lucide-react';

interface SplashScreenProps { onComplete: () => void }

const messages = [
  'Inicializando sistema...', 'Verificando dependencias...',
  'Cargando módulos de audio...', 'Preparando biblioteca...',
  'Optimizando rendimiento...', '¡Listo!',
];

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= messages.length - 1) {
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(s => s + 1), 500 + Math.random() * 400);
    return () => clearTimeout(t);
  }, [step, onComplete]);

  const progress = ((step) / (messages.length - 1)) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--bg-card-alt)' }}>
      <div className="text-center relative">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="mb-8 relative">
          <motion.div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center relative"
            style={{ background: 'linear-gradient(135deg, oklch(var(--zen-sakura-base) / 0.2), oklch(var(--zen-sakura-base) / 0.05))', border: '1px solid oklch(var(--zen-sakura-base) / 0.15)' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', inset: -2, borderRadius: 16, border: '1.5px solid transparent', borderTopColor: 'oklch(var(--zen-sakura-base))', borderRightColor: 'oklch(var(--zen-sakura-base) / 0.3)', opacity: 0.6 }} />
            <Music size={32} style={{ color: 'oklch(var(--zen-sakura-base))' }} />
          </motion.div>
        </motion.div>

        <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-2xl font-bold mb-1" style={{ color: '#eee' }}>
          Sakura Music
        </motion.h1>
        <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-xs mb-8" style={{ color: 'var(--text-label)' }}>
          Descargador y gestor de música
        </motion.p>

        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.4, duration: 0.5 }}
          className="w-56 mx-auto h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)', transformOrigin: 'left' }}>
          <motion.div className="h-full rounded-full" initial={{ width: 0 }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ background: 'linear-gradient(90deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))', boxShadow: '0 0 12px oklch(var(--zen-sakura-base) / 0.4)' }} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }}
            className="text-xs mt-4" style={{ color: 'var(--text-label)' }}>
            {messages[step]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
