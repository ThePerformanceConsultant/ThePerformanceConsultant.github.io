import {useEffect, useState} from 'react'

export function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname)

  useEffect(() => {
    const update = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener('publication:navigate', update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener('publication:navigate', update)
    }
  }, [])

  return pathname
}
