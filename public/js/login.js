// The login page.
import { getCurrentUser, login } from './api.js';

const form = document.querySelector('#login-form');
const errorBox = document.querySelector('#login-error');
const submitButton = form.querySelector('button[type="submit"]');

// Where to go after logging in: ?next=/new.html, but only pages on this
// site, so the login page can't be used to send someone to another website.
function nextPage() {
  const next = new URLSearchParams(window.location.search).get('next');
  if (!next) return '/';
  const url = new URL(next, window.location.origin);
  return url.origin === window.location.origin ? url.pathname + url.search : '/';
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? 'Logging in…' : 'Log in';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';

  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;
  if (!username || !password) {
    errorBox.textContent = 'Enter your username and password.';
    return;
  }

  setBusy(true);
  try {
    await login(username, password);
    window.location.href = nextPage();
  } catch (error) {
    errorBox.textContent = error.status === 401
      ? 'Wrong username or password.'
      : 'Something went wrong. Please try again.';
    form.elements.password.value = '';
    form.elements.password.focus();
    setBusy(false);
  }
});

// Already logged in? Skip the form.
getCurrentUser()
  .then((user) => {
    if (user) window.location.replace(nextPage());
  })
  .catch(() => {});
