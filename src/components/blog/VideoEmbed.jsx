'use client'

import Image from 'next/image'
import { useState } from 'react'
import { imageData, getVideoEmbed, safeExternalHref } from './blogUtils.js'

export function VideoEmbed({ value }) {
  const [loaded, setLoaded] = useState(false)
  const embed = getVideoEmbed(value)
  const poster = imageData(value?.poster)
  const title = value?.title || 'Embedded video'
  const source = safeExternalHref(value?.url)

  if (!embed) {
    return (
      <aside className="journal-video journal-video--unsupported">
        <p>This video source is not supported.</p>
        {source && <a href={source} target="_blank" rel="noreferrer">Open the original video</a>}
      </aside>
    )
  }

  return (
    <figure className="journal-video">
      <div className="journal-video__frame">
        {loaded ? (
          <iframe
            src={embed.src}
            title={title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button type="button" className="journal-video__consent" onClick={() => setLoaded(true)}>
            {poster && (
              <Image
                src={poster.url}
                alt={value?.posterAlt || poster.alt || ''}
                width={poster.width}
                height={poster.height}
                sizes="(max-width: 900px) 100vw, 820px"
              />
            )}
            <span className="journal-video__shade" aria-hidden="true" />
            <span className="journal-video__play" aria-hidden="true"><i /></span>
            <span className="journal-video__copy">
              <b>Load {embed.provider} video</b>
              <small>External content loads only after you select play.</small>
            </span>
          </button>
        )}
      </div>
      {value?.caption && <figcaption>{value.caption}</figcaption>}
    </figure>
  )
}
