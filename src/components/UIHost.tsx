import { AnimatePresence, motion } from 'framer-motion'
import { Award, CheckCircle2, Coffee, Flame, FlameKindling, Info, Star, X, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUI, type PopupSpec } from '@/context/UIContext'
import { cn } from '@/lib/utils'

const ICONS = { star: Star, award: Award, flame: Flame, 'flame-off': FlameKindling, check: CheckCircle2, coffee: Coffee }
const TONES: Record<PopupSpec['tone'], string> = {
  good: 'bg-ember-400 text-ink',
  warn: 'bg-ember-500 text-ink',
  sad: 'bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
}

/** Renders the toast stack and the modal popup queue. Mounted once at the app root. */
export default function UIHost() {
  const { toasts, dismissToast, popup, closePopup } = useUI()
  const navigate = useNavigate()
  const Icon = popup ? ICONS[popup.icon] : Star

  return (
    <>
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex w-[min(92vw,360px)] flex-col gap-2 md:bottom-6" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const I = t.kind === 'error' ? XCircle : t.kind === 'success' ? CheckCircle2 : Info
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-deep-800">
                <I className={cn('mt-0.5 h-5 w-5 shrink-0', t.kind === 'error' ? 'text-red-500' : 'text-tide-500')} />
                <p className="flex-1 text-sm leading-snug">{t.text}</p>
                <button onClick={() => dismissToast(t.id)} className="muted" aria-label="Dismiss"><X className="h-4 w-4" /></button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {popup && (
          <motion.div key="popup" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closePopup}>
            <motion.div role="dialog" aria-modal="true" aria-label={popup.title} className="card w-full max-w-sm text-center"
              initial={{ scale: 0.6, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }} onClick={(e) => e.stopPropagation()}>
              <motion.div className={cn('mx-auto flex h-24 w-24 items-center justify-center rounded-full', TONES[popup.tone])}
                animate={popup.tone === 'sad' ? { y: [0, 4, 0] } : { rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: 2 }}>
                <Icon className="h-12 w-12" fill={popup.icon === 'star' || popup.icon === 'flame' ? 'currentColor' : 'none'} />
              </motion.div>
              <h2 className="mt-4 text-2xl font-extrabold">{popup.title}</h2>
              <p className="muted mt-2 text-sm leading-relaxed">{popup.body}</p>
              <div className="mt-5 flex flex-col gap-2">
                {popup.primary && (
                  <button className="btn-primary w-full" onClick={() => { const to = popup.primary?.to; closePopup(); if (to) navigate(to) }}>{popup.primary.label}</button>
                )}
                <button className="btn-ghost w-full" onClick={closePopup}>{popup.primary ? 'Not now' : 'Continue'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
