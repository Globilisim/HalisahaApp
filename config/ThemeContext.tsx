import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import designSystem from './design-system.json';

type ThemeType = typeof designSystem.themes.light;
type ThemeMode = 'light' | 'dark' | 'auto';

// User Configuration
const CONFIG = {
    storageKey: 'halisaha-theme',
    attributeName: 'data-theme',
    fallback: 'light' as ThemeMode,
    checkSystemPreference: true
};

interface ThemeContextType {
    theme: ThemeType;
    spacing: typeof designSystem.spacing;
    radius: typeof designSystem.borderRadius;
    typography: typeof designSystem.typography;
    mode: ThemeMode;
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: designSystem.themes.light,
    spacing: designSystem.spacing,
    radius: designSystem.borderRadius,
    typography: designSystem.typography,
    mode: CONFIG.fallback,
    isDark: false,
    setMode: () => { },
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const systemScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>(CONFIG.fallback);

    useEffect(() => {
        loadTheme();
    }, []);

    // Web: Update HTML attribute & CSS Variables
    useEffect(() => {
        if (Platform.OS === 'web') {
            const isDark = mode === 'auto' ? systemScheme === 'dark' : mode === 'dark';
            const themeValue = isDark ? 'dark' : 'light';
            const activeTheme = isDark ? designSystem.themes.dark : designSystem.themes.light;

            // @ts-ignore
            if (typeof document !== 'undefined') {
                const root = document.documentElement;
                root.setAttribute(CONFIG.attributeName, themeValue);

                // Inject CSS Variables
                Object.entries(activeTheme).forEach(([key, value]) => {
                    const cssVarName = `--${key}`; // e.g., --color-primary
                    root.style.setProperty(cssVarName, value);
                });

                // Add global transition
                if (!document.getElementById('theme-transition')) {
                    const style = document.createElement('style');
                    style.id = 'theme-transition';
                    style.innerHTML = `
                        * {
                            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        }
    }, [mode, systemScheme]);

    const loadTheme = async () => {
        try {
            const savedMode = await AsyncStorage.getItem(CONFIG.storageKey);
            if (savedMode) {
                setModeState(savedMode as ThemeMode);
            } else if (CONFIG.checkSystemPreference) {
                setModeState('auto');
            }
        } catch (e) {
            console.error('Failed to load theme mode', e);
        }
    };

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        try {
            await AsyncStorage.setItem(CONFIG.storageKey, newMode);
        } catch (e) {
            console.error('Failed to save theme mode', e);
        }
    };

    const isDark = mode === 'auto' ? systemScheme === 'dark' : mode === 'dark';
    const theme = isDark ? designSystem.themes.dark : designSystem.themes.light;

    return (
        <ThemeContext.Provider value={{
            theme,
            spacing: designSystem.spacing,
            radius: designSystem.borderRadius,
            typography: designSystem.typography,
            mode,
            isDark,
            setMode
        }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
