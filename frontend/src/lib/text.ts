const CJK = /[぀-ヿ㐀-鿿가-힯]/

export function tokenize(text: string): string[] {
  const out: string[] = []
  const seg =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new Intl.Segmenter(undefined, { granularity: 'word' })
      : null
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue
    if (seg && raw.length > 4 && CJK.test(raw)) {
      for (const s of seg.segment(raw)) out.push(s.segment)
    } else {
      out.push(raw)
    }
  }
  return out
}

/** Index of the "optimal recognition point" letter inside a word. */
export function focusIndex(word: string): number {
  const chars = Array.from(word)
  const n = chars.length
  let start = 0
  while (start < n - 1 && !/[\p{L}\p{N}]/u.test(chars[start])) start++
  let end = n
  while (end - 1 > start && !/[\p{L}\p{N}]/u.test(chars[end - 1])) end--
  const len = end - start
  const off = len <= 1 ? 0 : len <= 5 ? 1 : len <= 9 ? 2 : len <= 13 ? 3 : 4
  return Math.min(start + off, n - 1)
}

export interface TimingOptions {
  wpm: number
  pausePunct: boolean
  pauseLong: boolean
}

export function wordDelay(word: string, o: TimingOptions): number {
  let m = 1
  if (o.pausePunct) {
    if (/[.!?…。！？]["'”’»)\]]*$/u.test(word)) m = 2.2
    else if (/[,;:，、；：—–-]["'”’»)\]]*$/u.test(word)) m = 1.6
  }
  if (o.pauseLong) {
    const len = Array.from(word).length
    if (len > 8) m += Math.min(0.12 * (len - 8), 1)
  }
  return (60000 / o.wpm) * m
}

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
