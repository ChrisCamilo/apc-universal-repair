import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.ts'
import './index.css'
import { ToastProvider } from './components/Toast.tsx'
import { ThemeProvider } from './ThemeProvider.tsx'
import App from './App.tsx'

// The demo's build (VITE_DEMO) answers /api in the browser, with no server, logs its user in and shows its notice (see
// src/demo/startDemo.ts); the app's own build leaves it out, which its build script checks.
const demo = import.meta.env.VITE_DEMO ? await (await import('./demo/startDemo.ts')).startDemo() : undefined

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        {demo && <demo.Notice />}
        <App login={demo?.login} />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
