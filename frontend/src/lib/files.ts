export const MAX_TEXT_BYTES = 5 * 1024 * 1024
export const MAX_PDF_BYTES = 40 * 1024 * 1024

export type FileErrorCode = 'big' | 'unsupported' | 'pdf' | 'pdf-empty' | 'pdf-encrypted'

export class FileError extends Error {
  code: FileErrorCode
  constructor(code: FileErrorCode) {
    super(code)
    this.code = code
  }
}

/** Single-byte code page to try when a file is not valid UTF-8, picked from the UI language. */
const LEGACY_CHARSET: Record<string, string> = {
  ru: 'windows-1251',
  uk: 'windows-1251',
  pl: 'windows-1250',
  cs: 'windows-1250',
  tr: 'windows-1254',
}

function decode(buf: ArrayBuffer, lang: string): string {
  const b = new Uint8Array(buf.slice(0, 4))
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf)
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(buf)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder(LEGACY_CHARSET[lang] ?? 'windows-1252').decode(buf)
  }
}

/** Invisible characters that would otherwise glue onto words or show up as odd glyphs. */
function clean(text: string): string {
  return text
    .replace(/[­​-‍⁠﻿]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
}

export function stripMarkdown(src: string): string {
  let t = src.replace(/\r\n?/g, '\n')
  t = t.replace(/^---\n[\s\S]*?\n(---|\.\.\.)[ \t]*(\n|$)/, '') // YAML front matter
  t = t.replace(/^(```|~~~)[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm, '$2') // fenced code: keep the body
  t = t.replace(/<!--[\s\S]*?-->/g, '')
  t = t.replace(/!\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\[[^\]]*\]/g, '') // images
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url)
  t = t.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1') // [text][ref]
  t = t.replace(/^[ \t]*\[\^?[^\]]+\]:[ \t]+\S.*$/gm, '') // reference / footnote definitions
  t = t.replace(/\[\^[^\]]+\]/g, '') // footnote marks
  t = t.replace(/<(https?:\/\/[^>\s]+|[^>\s@]+@[^>\s]+)>/g, '$1') // <autolink>
  t = t.replace(/<\/?[a-zA-Z][^>]*>/g, ' ') // inline html
  t = t.replace(/^[ \t]*(?:[-*_][ \t]*){3,}$/gm, '') // horizontal rules
  t = t.replace(/^[=-]{2,}[ \t]*$/gm, '') // setext underlines
  t = t.replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '').replace(/[ \t]+#+[ \t]*$/gm, '') // headings
  t = t.replace(/^(?:[ \t]*>)+[ \t]?/gm, '') // blockquotes
  t = t.replace(/^[ \t]*(?:[-*+]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?/gm, '') // list markers
  t = t.replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(?:\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*$/gm, '') // table rules
  t = t.replace(/^[ \t]*\|/gm, '').replace(/\|[ \t]*$/gm, '').replace(/[ \t]*\|[ \t]*/g, ' ')
  t = t.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '$2') // bold
  t = t.replace(/(^|[\s([{"'“‘])([*_])(?=\S)([^\n]*?\S)\2(?=$|[\s)\]}.,;:!?"'”’])/gm, '$1$3') // italic, not snake_case
  t = t.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '$1') // strikethrough
  t = t.replace(/`+([^`\n]+)`+/g, '$1') // inline code
  t = t.replace(/\\([\\`*_{}[\]()#+\-.!>|~<])/g, '$1') // escapes
  return t
}

const BLOCK_TAGS = new Set(
  'p div br hr li ul ol dl dt dd h1 h2 h3 h4 h5 h6 tr td th table section article header footer nav aside blockquote pre figure figcaption title v stanza poem subtitle epigraph text-author empty-line cite annotation'.split(' '),
)
const NON_TEXT = 'script,style,noscript,template,svg,head,iframe,object,embed,canvas,binary,stylesheet,description'

export function markupToText(src: string, xml: boolean): string {
  let doc: Document | null = null
  if (xml) {
    const x = new DOMParser().parseFromString(src, 'application/xml')
    if (!x.querySelector('parsererror')) doc = x
  }
  doc ??= new DOMParser().parseFromString(src, 'text/html')
  doc.querySelectorAll(NON_TEXT).forEach((n) => n.remove())
  const root = (doc.body as HTMLElement | null) ?? doc.documentElement
  root.querySelectorAll('*').forEach((el) => {
    if (BLOCK_TAGS.has(el.localName.toLowerCase())) {
      el.before(doc.createTextNode('\n'))
      el.after(doc.createTextNode('\n'))
    }
  })
  return root.textContent ?? ''
}

export function subtitlesToText(src: string): string {
  const out: string[] = []
  let skip = false
  for (const line of src.split(/\r?\n/)) {
    if (!line.trim()) {
      skip = false
      continue
    }
    if (skip) continue
    if (/^(NOTE|STYLE|REGION)\b/.test(line)) {
      skip = true
      continue
    }
    if (/^WEBVTT/.test(line) || /^\d+\s*$/.test(line) || /-->/.test(line)) continue
    out.push(line.replace(/<[^>]*>|\{[^}]*\}/g, ''))
  }
  return out.join('\n')
}

interface PdfItem {
  str: string
  hasEOL: boolean
  width: number
  height: number
  transform: number[]
}

export async function pdfToText(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

  const task = pdfjs.getDocument({ data: new Uint8Array(buf) })
  let doc
  try {
    doc = await task.promise
  } catch (e) {
    void task.destroy()
    throw new FileError(e instanceof Error && e.name === 'PasswordException' ? 'pdf-encrypted' : 'pdf')
  }
  try {
    const pages: string[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n)
      const content = await page.getTextContent()
      let s = ''
      let prev: PdfItem | null = null
      for (const raw of content.items) {
        if (!('str' in raw)) continue
        const it = raw as unknown as PdfItem
        if (prev) {
          const sameLine = Math.abs(it.transform[5] - prev.transform[5]) < Math.max(prev.height, 1) * 0.5
          if (!sameLine) s += '\n'
          else if (!/\s$/.test(s) && !/^\s/.test(it.str)) {
            const gap = it.transform[4] - (prev.transform[4] + prev.width)
            if (gap > Math.max(it.height, prev.height) * 0.12) s += ' '
          }
        }
        s += it.str
        if (it.hasEOL) s += '\n'
        prev = it
      }
      pages.push(s)
      page.cleanup()
    }
    // join words hyphenated at a line end ("exam-\nple"); keep real hyphens before capitals/digits
    return pages.join('\n\n').replace(/(\p{Ll})-\n(\p{Ll})/gu, '$1$2')
  } catch {
    throw new FileError('pdf')
  } finally {
    void task.destroy()
  }
}

export async function readTextFile(file: File, lang: string): Promise<string> {
  const buf = await file.arrayBuffer()
  const head = new Uint8Array(buf.slice(0, 5))
  const name = file.name.toLowerCase()
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 // %PDF
  if (isPdf || name.endsWith('.pdf')) {
    if (!isPdf) throw new FileError('pdf')
    if (file.size > MAX_PDF_BYTES) throw new FileError('big')
    const text = clean(await pdfToText(buf))
    if ((text.match(/\p{L}/gu) ?? []).length < 10) throw new FileError('pdf-empty')
    return text
  }
  if (file.size > MAX_TEXT_BYTES) throw new FileError('big')
  if (head[0] === 0x50 && head[1] === 0x4b) throw new FileError('unsupported') // zip: docx, epub, ...
  let text = decode(buf, lang)
  if (text.includes('\u0000') || text.startsWith('{\\rtf')) throw new FileError('unsupported')

  if (/\.(html?|xhtml)$/.test(name)) text = markupToText(text, false)
  else if (/\.(fb2|xml)$/.test(name)) text = markupToText(text, true)
  else if (/\.(srt|vtt|sub)$/.test(name)) text = subtitlesToText(text)
  else if (/\.(md|markdown|mdown)$/.test(name)) text = stripMarkdown(text)
  return clean(text)
}
