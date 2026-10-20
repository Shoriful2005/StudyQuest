import { useCallback, useEffect, useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useUI } from '@/context/UIContext'
import { useSubjects } from '@/lib/data'
import type { Task } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLORS = ['#14958A', '#F59E0B', '#6366F1', '#EC4899', '#EF4444', '#22C55E', '#0EA5E9', '#A855F7']
const TAG: Record<Task['priority'], string> = {
  high: 'bg-red-500/15 text-red-600 dark:text-red-400',
  medium: 'bg-ember-400/20 text-ember-600 dark:text-ember-400',
  low: 'bg-tide-500/15 text-tide-700 dark:text-tide-400',
}
const ORDER = { high: 0, medium: 1, low: 2 }

export default function TasksPage() {
  const { toast } = useUI()
  const { subjects, reload: reloadSubjects } = useSubjects()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('medium')
  const [due, setDue] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [sName, setSName] = useState('')
  const [sColor, setSColor] = useState(COLORS[0])

  const loadTasks = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (error) toast(error.message, 'error')
    setTasks((data ?? []) as Task[])
  }, [toast])
  useEffect(() => { void loadTasks() }, [loadTasks])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('tasks').insert({ user_id: u.user?.id, title: title.trim(), subject_id: subjectId || null, priority, due_date: due || null })
    if (error) return toast(error.message, 'error')
    setTitle(''); setDue(''); await loadTasks()
  }
  async function toggle(t: Task) {
    setTasks((x) => x.map((y) => (y.id === t.id ? { ...y, done: !y.done } : y)))
    await supabase.from('tasks').update({ done: !t.done, completed_at: t.done ? null : new Date().toISOString() }).eq('id', t.id)
  }
  async function saveEdit(id: string) {
    if (editText.trim()) await supabase.from('tasks').update({ title: editText.trim() }).eq('id', id)
    setEditId(null); await loadTasks()
  }
  async function remove(id: string) {
    setTasks((x) => x.filter((y) => y.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }
  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    if (!sName.trim()) return
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('subjects').insert({ user_id: u.user?.id, name: sName.trim(), color: sColor })
    if (error) return toast(error.code === '23505' ? 'You already have a subject with that name' : error.message, 'error')
    setSName(''); await reloadSubjects()
  }
  async function removeSubject(id: string) {
    await supabase.from('subjects').delete().eq('id', id)
    if (filter === id) setFilter('all')
    await Promise.all([reloadSubjects(), loadTasks()])
  }

  const subj = (id: string | null) => subjects.find((s) => s.id === id)
  const shown = tasks
    .filter((t) => filter === 'all' || (filter === 'none' ? !t.subject_id : t.subject_id === filter))
    .sort((a, b) => Number(a.done) - Number(b.done) || ORDER[a.priority] - ORDER[b.priority])
  const done = shown.filter((t) => t.done).length
  const pct = shown.length ? Math.round((done / shown.length) * 100) : 0

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <section className="card">
          <div className="mb-2 flex justify-between text-sm font-semibold"><span>Progress</span><span>{done}/{shown.length} done · {pct}%</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-tide-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </section>

        <form onSubmit={addTask} className="card grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className="input sm:col-span-3" placeholder="Add a task, e.g. “Solve 10 algebra problems”" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-label="Subject">
            <option value="">No subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input sm:!w-auto" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])} aria-label="Priority">
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <input className="input sm:!w-auto" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
          <button className="btn-primary sm:col-span-3 sm:justify-self-end"><Plus className="h-4 w-4" />Add task</button>
        </form>

        <div className="flex flex-wrap gap-2">
          {[{ id: 'all', name: 'All' }, ...subjects, { id: 'none', name: 'No subject' }].map((s) => (
            <button key={s.id} onClick={() => setFilter(s.id)} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', filter === s.id ? 'border-tide-600 bg-tide-600 text-white' : 'border-slate-300 dark:border-white/15')}>{s.name}</button>
          ))}
        </div>

        {shown.length === 0 ? <p className="muted text-center text-sm">No tasks here yet. Add your first one above.</p> : (
          <ul className="space-y-2">
            {shown.map((t) => (
              <li key={t.id} className="card flex items-center gap-3 !p-3">
                <button role="checkbox" aria-checked={t.done} aria-label={`Mark “${t.title}” ${t.done ? 'not done' : 'done'}`} onClick={() => void toggle(t)}
                  className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-colors', t.done ? 'border-tide-500 bg-tide-500 text-white' : 'border-slate-300 dark:border-white/30')}>
                  {t.done && <Check className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  {editId === t.id ? (
                    <input autoFocus className="input !py-1" value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(t.id); if (e.key === 'Escape') setEditId(null) }} />
                  ) : (
                    <p className={cn('truncate text-sm font-medium', t.done && 'muted line-through')}>{t.title}</p>
                  )}
                  <p className="muted mt-0.5 flex items-center gap-2 text-xs">
                    {subj(t.subject_id) && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: subj(t.subject_id)?.color }} />{subj(t.subject_id)?.name}</span>}
                    {t.due_date && <span>Due {t.due_date}</span>}
                  </p>
                </div>
                <span className={cn('hidden rounded-full px-2.5 py-0.5 text-xs font-bold capitalize sm:inline', TAG[t.priority])}>{t.priority}</span>
                {editId === t.id ? (
                  <>
                    <button className="text-tide-600" aria-label="Save" onClick={() => void saveEdit(t.id)}><Check className="h-4 w-4" /></button>
                    <button className="muted" aria-label="Cancel" onClick={() => setEditId(null)}><X className="h-4 w-4" /></button>
                  </>
                ) : (
                  <button className="muted hover:text-tide-500" aria-label="Edit" onClick={() => { setEditId(t.id); setEditText(t.title) }}><Pencil className="h-4 w-4" /></button>
                )}
                <button className="muted hover:text-red-500" aria-label="Delete" onClick={() => void remove(t.id)}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="card h-fit">
        <h2 className="mb-3 font-bold">Subjects</h2>
        <ul className="mb-4 space-y-2">
          {subjects.length === 0 && <li className="muted text-sm">Add subjects like Math or Physics to organise tasks and see them in Analytics.</li>}
          {subjects.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm font-medium">
              <span className="h-3 w-3 rounded-full" style={{ background: s.color }} /><span className="flex-1 truncate">{s.name}</span>
              <button className="muted hover:text-red-500" aria-label={`Delete ${s.name}`} onClick={() => void removeSubject(s.id)}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <form onSubmit={addSubject} className="space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">
          <input className="input" placeholder="New subject" value={sName} onChange={(e) => setSName(e.target.value)} maxLength={60} />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
            {COLORS.map((c) => <button type="button" key={c} role="radio" aria-checked={sColor === c} aria-label={c} onClick={() => setSColor(c)} className={cn('h-6 w-6 rounded-full ring-offset-2 dark:ring-offset-deep-850', sColor === c && 'ring-2 ring-slate-500')} style={{ background: c }} />)}
          </div>
          <button className="btn-primary w-full"><Plus className="h-4 w-4" />Add subject</button>
        </form>
      </aside>
    </div>
  )
}
