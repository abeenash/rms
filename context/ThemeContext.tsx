import * as SystemUI from 'expo-system-ui'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'

type Theme = "light" | "dark"

type ThemeContextType = {
    theme: Theme
    isDark: boolean
    toggleTheme: () => void
}

// also painted on the native window, which shows under the Android navigation bar
export const APP_BACKGROUND: Record<Theme, string> = {
    light: "#F8FAFC",
    dark: "#0F172A",
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const systemScheme = useColorScheme()

    const [theme, setTheme] = useState<Theme>(systemScheme === "dark" ? "dark" : "light")

    useEffect(() => {
        if (systemScheme === "light" || systemScheme === "dark") {
            setTheme(systemScheme)
        }
    }, [systemScheme])

    // the in-app toggle doesn't change the system theme, so repaint the window ourselves
    useEffect(() => {
        SystemUI.setBackgroundColorAsync(APP_BACKGROUND[theme]).catch(() => { })
    }, [theme])

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"))
    }
    return (
        <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () =>{
    const context = useContext(ThemeContext)

    if(!context) throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
