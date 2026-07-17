import { forwardRef } from 'react'

function hrefValue(href) {
  if (typeof href === 'string') return href
  if (href?.pathname) {
    const search = href.query ? `?${new URLSearchParams(href.query)}` : ''
    return `${href.pathname}${search}${href.hash || ''}`
  }
  return '/blog'
}

const Link = forwardRef(function Link({ href, onClick, target, children, ...props }, ref) {
  const value = hrefValue(href)

  const navigate = (event) => {
    onClick?.(event)
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
      || target === '_blank'
      || !value.startsWith('/blog')
    ) return

    event.preventDefault()
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== value) {
      window.history.pushState({}, '', value)
    }
    window.dispatchEvent(new Event('publication:navigate'))
  }

  return <a ref={ref} href={value} target={target} onClick={navigate} {...props}>{children}</a>
})

export default Link
