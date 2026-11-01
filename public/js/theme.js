// The light/dark theme button in the header.
// Without a saved choice, the site follows the visitor's system setting.
// A click saves the choice in localStorage, and a small script in each
// page's <head> applies it before the page is drawn, so it never flashes.

const STORAGE_KEY = 'theme';
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function savedTheme() {
  try {
    const theme = localStorage.getItem(STORAGE_KEY);
    return theme === 'light' || theme === 'dark' ? theme : null;
  } catch {
    return null; // storage can be blocked, e.g. in some private windows
  }
}

function currentTheme() {
  return savedTheme() || (systemPrefersDark.matches ? 'dark' : 'light');
}

function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Can't save: the theme still changes for this page
  }
}

function renderButton(button) {
  const isDark = currentTheme() === 'dark';
  const next = isDark ? 'light' : 'dark';
  button.setAttribute('aria-label', `Switch to ${next} theme`);
  button.querySelector('.theme-toggle__icon').textContent = isDark ? '☀' : '☾';
  button.querySelector('.theme-toggle__text').textContent = isDark ? 'Light' : 'Dark';
}

function initThemeToggle() {
  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-toggle';

  const icon = document.createElement('span');
  icon.className = 'theme-toggle__icon';
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.className = 'theme-toggle__text';
  button.append(icon, text);

  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    saveTheme(next);
    renderButton(button);
  });

  // If the system setting changes and nothing is saved, update the label
  systemPrefersDark.addEventListener('change', () => renderButton(button));

  renderButton(button);
  nav.append(button);
}

initThemeToggle();
