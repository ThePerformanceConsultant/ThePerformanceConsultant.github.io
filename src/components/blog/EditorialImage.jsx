import Image from 'next/image'
import { imageData } from './blogUtils.js'

export function EditorialImage({
  image,
  className = '',
  imageClassName = '',
  sizes = '100vw',
  priority = false,
  showCaption = true,
}) {
  const data = imageData(image)
  if (!data) return null

  return (
    <figure className={`journal-media ${className}`.trim()}>
      <div className="journal-media__frame">
        <Image
          className={imageClassName}
          src={data.url}
          alt={data.alt}
          width={data.width}
          height={data.height}
          sizes={sizes}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
        />
      </div>
      {showCaption && (data.caption || data.credit) && (
        <figcaption>
          {data.caption && <span>{data.caption}</span>}
          {data.credit && <cite>{data.credit}</cite>}
        </figcaption>
      )}
    </figure>
  )
}
