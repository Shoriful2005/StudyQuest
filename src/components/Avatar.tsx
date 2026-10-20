import { cn, initials } from '@/lib/utils'

export default function Avatar({ name, url, size = 40, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.38 }
  return url ? (
    <img src={url} alt={name} style={style} referrerPolicy="no-referrer" className={cn('rounded-full object-cover', className)} />
  ) : (
    <span style={style} aria-label={name} className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-tide-600 font-bold text-white', className)}>{initials(name)}</span>
  )
}
