import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "sonner"

import "./index.css"
import App from "./App.tsx"
import { QueryProvider } from "./lib/query-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <App />
        <Toaster position="top-right" />
      </QueryProvider>
    </BrowserRouter>
  </StrictMode>
)
