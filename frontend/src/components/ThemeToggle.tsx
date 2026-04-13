import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 18a6 6 0 1 1 0-12a6 6 0 0 1 0 12Zm0-14.5a1 1 0 0 1 1 1V5a1 1 0 1 1-2 0v-.5a1 1 0 0 1 1-1Zm0 15.5a1 1 0 0 1 1 1v.5a1 1 0 1 1-2 0V20a1 1 0 0 1 1-1Zm8-8a1 1 0 0 1 1 1a1 1 0 0 1-1 1h-.5a1 1 0 1 1 0-2H20Zm-15.5 0a1 1 0 0 1 1 1a1 1 0 0 1-1 1H4a1 1 0 1 1 0-2h.5Zm13.096-5.596a1 1 0 0 1 1.414 0a1 1 0 0 1 0 1.414l-.354.354a1 1 0 1 1-1.414-1.414l.354-.354ZM6.758 16.742a1 1 0 0 1 1.414 0a1 1 0 0 1 0 1.414l-.354.354a1 1 0 1 1-1.414-1.414l.354-.354ZM18.656 16.742a1 1 0 0 1 1.414 1.414l-.354.354a1 1 0 1 1-1.414-1.414l.354-.354ZM7.112 5.404a1 1 0 0 1 1.414 1.414l-.354.354a1 1 0 1 1-1.414-1.414l.354-.354Z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M21 15.2A8.6 8.6 0 0 1 8.8 3a1 1 0 0 0-1.12 1.3A10 10 0 1 0 22.3 16.32a1 1 0 0 0-1.3-1.12Z"
      />
    </svg>
  );
}

function getCurrentTheme(): Theme {
  const raw = document.documentElement.dataset.theme;
  return raw === "dark" ? "dark" : "light";
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
}

function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() => getCurrentTheme());

  useEffect(() => {
    setThemeState(getCurrentTheme());
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      onClick={() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setTheme(next);
        setThemeState(next);
      }}
    >
      <span className="theme-toggle__icon">
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

export default ThemeToggle;

