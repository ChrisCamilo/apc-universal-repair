import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.ts'
import './index.css'
import { ThemeProvider } from './ThemeProvider.tsx'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
