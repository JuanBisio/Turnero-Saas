/**
 * Deterministic color assignment per professional
 * Same id -> same color always, regardless of fetch order
 */

export type ProfessionalColor = {
  name: string
  dot: string
  text: string
  bg: string
  border: string
  bgSoft: string
}

const PALETTE: ProfessionalColor[] = [
  { name: 'indigo', dot: 'bg-indigo-400', text: 'text-indigo-300', border: 'border-indigo-400/60', bg: 'bg-indigo-500/15', bgSoft: 'bg-indigo-500/10' },
  { name: 'emerald', dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-400/60', bg: 'bg-emerald-500/15', bgSoft: 'bg-emerald-500/10' },
  { name: 'amber', dot: 'bg-amber-400', text: 'text-amber-300', border: 'border-amber-400/60', bg: 'bg-amber-500/15', bgSoft: 'bg-amber-500/10' },
  { name: 'pink', dot: 'bg-pink-400', text: 'text-pink-300', border: 'border-pink-400/60', bg: 'bg-pink-500/15', bgSoft: 'bg-pink-500/10' },
  { name: 'sky', dot: 'bg-sky-400', text: 'text-sky-300', border: 'border-sky-400/60', bg: 'bg-sky-500/15', bgSoft: 'bg-sky-500/10' },
  { name: 'violet', dot: 'bg-violet-400', text: 'text-violet-300', border: 'border-violet-400/60', bg: 'bg-violet-500/15', bgSoft: 'bg-violet-500/10' },
  { name: 'rose', dot: 'bg-rose-400', text: 'text-rose-300', border: 'border-rose-400/60', bg: 'bg-rose-500/15', bgSoft: 'bg-rose-500/10' },
  { name: 'teal', dot: 'bg-teal-400', text: 'text-teal-300', border: 'border-teal-400/60', bg: 'bg-teal-500/15', bgSoft: 'bg-teal-500/10' },
]

function hashString(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getProfessionalColor(id: string): ProfessionalColor {
  return PALETTE[hashString(id) % PALETTE.length]
}
