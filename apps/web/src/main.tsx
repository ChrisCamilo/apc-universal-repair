import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.ts'
import './index.css'
import { ToastProvider } from './components/Toast.tsx'
import { ThemeProvider } from './ThemeProvider.tsx'
import App from './App.tsx'

// The demo's build (VITE_DEMO) answers /api in the browser, with no server (see src/demo); the app's own build leaves
// it out, which its build script checks.
if (import.meta.env.VITE_DEMO) {
  const { installDemoApi } = await import('./demo/installDemoApi.ts')
  installDemoApi()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
