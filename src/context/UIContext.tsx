import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type PopupSpec = {
  icon: 'star' | 'award' | 'flame' | 'flame-off' | 'check' | 'coffee'
  tone: 'good' | 'warn' | 'sad'
  title: string
  body: string
  primary?: { label: string; to?: string }
}
export type ToastItem = { id: number; text: string; kind: 'info' | 'success' | 'error' }
type Theme = 'light' | 'dark'

type UICtx = {
  theme: Theme
  toggleTheme: () => void
  toasts: ToastItem[]
  toast: (text: string, kind?: ToastItem['kind']) => void
  dismissToast: (id: number) => void
  popup: PopupSpec | null
  showPopup: (p: PopupSpec) => void
  closePopup: () => void
}

const Ctx = createContext<UICtx | null>(null)
let nextId = 1

const initialTheme = (): Theme => {
  const v = localStorage.getItem('sq:theme')
  if (v === 'light' || v === 'dark') return v
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [queue, setQueue] = useState<PopupSpec[]>([])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('sq:theme', theme)
  }, [theme])

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback((text: string, kind: ToastItem['kind'] = 'info') => {
    const id = nextId++
    setToasts((t) => [...t, { id, text, kind }])
    setTimeout(() => dismissToast(id), 6500)
  }, [dismissToast])
  const showPopup = useCallback((p: PopupSpec) => setQueue((q) => [...q, p]), [])
  const closePopup = useCallback(() => setQueue((q) => q.slice(1)), [])
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo(
    () => ({ theme, toggleTheme, toasts, toast, dismissToast, popup: queue[0] ?? null, showPopup, closePopup }),
    [theme, toggleTheme, toasts, toast, dismissToast, queue, showPopup, closePopup],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useUI() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI must be used inside UIProvider')
  return c
}
