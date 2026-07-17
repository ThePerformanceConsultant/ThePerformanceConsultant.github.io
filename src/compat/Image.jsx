import { forwardRef } from 'react'

const Image = forwardRef(function Image({
  src,
  alt = '',
  width,
  height,
  priority = false,
  fill: _fill,
  quality: _quality,
  loader: _loader,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  unoptimized: _unoptimized,
  ...props
}, ref) {
  const source = typeof src === 'string' ? src : src?.src
  return (
    <img
      ref={ref}
      src={source}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : props.loading || 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      {...props}
    />
  )
})

export default Image
