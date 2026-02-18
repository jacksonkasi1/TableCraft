import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

function isValidTheme(value: unknown): value is Theme {
    return value === "dark" || value === "light" || value === "system"
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window === "undefined") return defaultTheme
        const stored = localStorage.getItem(storageKey)
        return isValidTheme(stored) ? stored : defaultTheme
    })

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove("light", "dark")

        if (theme === "system") {
            const media = window.matchMedia("(prefers-color-scheme: dark)")
            const systemTheme = media.matches ? "dark" : "light"
            root.classList.add(systemTheme)

            const handler = (e: MediaQueryListEvent) => {
                root.classList.remove("light", "dark")
                root.classList.add(e.matches ? "dark" : "light")
            }
            media.addEventListener("change", handler)
            return () => media.removeEventListener("change", handler)
        }

        root.classList.add(theme)
    }, [theme])

    const value = useMemo(() => ({
        theme,
        setTheme: (newTheme: Theme) => {
            localStorage.setItem(storageKey, newTheme)
            setTheme(newTheme)
        },
    }), [theme, storageKey])

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
