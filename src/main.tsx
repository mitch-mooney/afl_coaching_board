import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// The two faces are bundled with the build rather than fetched from a font CDN,
// so the iPad renders them offline. Upright only: the type scale uses no italic.
import '@fontsource-variable/public-sans/wght'
import '@fontsource-variable/big-shoulders-display/wght'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
