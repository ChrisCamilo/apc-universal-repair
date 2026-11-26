import { useEffect, useRef } from 'react'
import { useMessages } from '../app/useLocale.ts'
import { WEB_TEXTS } from '../app/webTexts.ts'
import { demoNotice } from './DemoNotice.styles.ts'

// The notice above the web app's demo: what the demo is, and a link to the repository. It sits in the page's flow and
// keeps its height in --top-inset, which the app's screens take off the window's height (AppFrame, the login), so
// it covers nothing and the page doesn't scroll, also when it wraps on a phone.

/** The project's repository, which the notice links to. */
export const REPOSITORY_URL = 'https://github.com/ChrisCamilo/apc-universal-repair'

export function DemoNotice() {
  const { classes, ids } = demoNotice()
  const texts = useMessages(WEB_TEXTS).demo
  const bar = useRef<HTMLDivElement>(null)

  // Keep the notice's height for the screens under it, as it wraps or unwraps.
  useEffect(() => {
    const root = document.documentElement
    const observer = new ResizeObserver(([entry]) => root.style.setProperty('--top-inset', `${entry.borderBoxSize[0].blockSize}px`))
    observer.observe(bar.current!)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--top-inset')
    }
  }, [])

  return (
    <div ref={bar} role="note" className={classes.base()} data-testid={ids.base}>
      <p className={classes.text()} data-testid={ids.text}>
        {texts.notice}
      </p>
      <a className={classes.link()} data-testid={ids.link} href={REPOSITORY_URL} target="_blank" rel="noreferrer">
        {texts.github}
      </a>
    </div>
  )
}
