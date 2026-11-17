import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'workpulse_theme';

export const ThemeProvider = ({ children }) => {
  // Always lock to clean, high-contrast light mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    } catch {
      // ignore
    }
    const root = document.documentElement;
    root.classList.remove('dark');
    if (document.body) {
      document.body.classList.remove('dark');
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        isDark: false,
        setTheme: () => {},
        toggleTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
