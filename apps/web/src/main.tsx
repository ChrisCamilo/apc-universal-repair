import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/titillium-web/400.css'
import '@fontsource/titillium-web/600.css'
import '@fontsource/titillium-web/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import { injectThemeCss } from './theme.ts'
import App from './App.tsx'

injectThemeCss()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
