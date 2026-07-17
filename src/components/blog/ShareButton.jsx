'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckIcon, CopyIcon } from './BlogIcons.jsx'

export function ShareButton({ title = '', url = '' }) {
  const [status, setStatus] = useState('idle')
  const timer = useRef(null)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const share = async () => {
    const shareUrl = url || window.location.href

    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl })
        setStatus('shared')
      } else {
        await navigator.clipboard.writeText(shareUrl)
        setStatus('copied')
      }
    } catch (error) {
      if (error?.name === 'AbortError') return
      setStatus('error')
    }

    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus('idle'), 2600)
  }

  const label = status === 'copied'
    ? 'Link copied'
    : status === 'shared'
      ? 'Share complete'
      : status === 'error'
        ? 'Unable to share'
        : 'Share article'

  return (
    <div className="journal-share">
      <button type="button" onClick={share}>
        {['copied', 'shared'].includes(status) ? <CheckIcon /> : <CopyIcon />}
        <span>{label}</span>
      </button>
      <span className="sr-only" aria-live="polite">{status === 'idle' ? '' : label}</span>
    </div>
  )
}
