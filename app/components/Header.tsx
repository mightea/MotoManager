"use client";

import { useTheme } from "~/contexts/ThemeProvider";

export default function Header() {
  const { theme } = useTheme(); // Use the theme from your context

  const toggleTheme = () => {};

  return (
    <header className="bg-white dark:bg-gray-700 sticky top-0">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-t-xl text-white flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mein Motorrad</h1>
        {/* Dark Mode Toggle Button */}
        <button
          id="darkModeToggle"
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors"
          aria-label="Toggle dark mode"
        >
          {/* Sun Icon for Light Mode */}
          {theme === "light" ? (
            <svg
              id="sunIcon"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 3v1m0 16v1m9-9h1M3 12h1m15.325-7.757l-.707.707M5.388 18.06l-.707.707m12.728 0l.707-.707M6.095 5.388l.707-.707"
              />
            </svg>
          ) : (
            // Moon Icon for Dark Mode
            <svg
              id="moonIcon"
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20.354 15.354A9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
