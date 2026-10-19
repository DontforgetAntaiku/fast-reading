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

export const MAX_FILE_BYTES = 5 * 1024 * 1024

export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error('big')
  const buf = await file.arrayBuffer()
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    text = new TextDecoder('windows-1251').decode(buf)
  }
  if (text.includes('\u0000')) throw new Error('binary')
  const name = file.name.toLowerCase()
  if (/\.(html?|xhtml|fb2|xml)$/.test(name)) {
    const doc = new DOMParser().parseFromString(text, 'text/html')
    doc.querySelectorAll('script,style').forEach((n) => n.remove())
    return doc.body.textContent ?? ''
  }
  if (/\.(srt|vtt)$/.test(name)) {
    return text
      .split(/\r?\n/)
      .filter((l) => !/^\s*\d+\s*$/.test(l) && !/-->/.test(l) && l.trim() !== 'WEBVTT')
      .join('\n')
  }
  return text
}
