import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.ts'
import './index.css'
import { ToastProvider } from './components/Toast.tsx'
import { ThemeProvider } from './ThemeProvider.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
