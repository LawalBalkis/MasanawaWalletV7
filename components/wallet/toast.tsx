'use client'

import { CheckCircle2, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

interface Toast {
  id: number
  title: string
  detail?: string
  kind: 'success' | 'info'
}

interface ToastContextValue {
  toast: (title: string, detail?: string, kind?: Toast['kind']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000)
    return () => clearTimeout(t)
  }, [toast.id, onDismiss])

  const Icon = toast.kind === 'success' ? CheckCircle2 : Info

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-popover p-4 shadow-lg"
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${toast.kind === 'success' ? 'text-primary' : 'text-muted-foreground'}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-popover-foreground">{toast.title}</p>
        {toast.detail && <p className="mt-0.5 text-xs text-muted-foreground">{toast.detail}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((title: string, detail?: string, kind: Toast['kind'] = 'success') => {
    idRef.current += 1
    setToasts((prev) => [...prev.slice(-2), { id: idRef.current, title, detail, kind }])
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
