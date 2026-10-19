import type { ReactNode } from 'react'

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, width: 18, height: 18 } as const

const make = (d: ReactNode) => () => <svg {...base}>{d}</svg>

export const PlayIcon = make(<path d="M7 4l13 8-13 8z" fill="currentColor" />)
export const PauseIcon = make(<><path d="M8 5v14M16 5v14" /></>)
export const RestartIcon = make(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>)
export const PrevIcon = make(<path d="M15 5l-7 7 7 7" />)
export const NextIcon = make(<path d="M9 5l7 7-7 7" />)
export const BackIcon = make(<><path d="M4 20h4l10-10-4-4L4 16z" /><path d="M13 7l4 4" /></>)
export const FileIcon = make(<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5" /></>)
