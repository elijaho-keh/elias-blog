// Shows the login state in the header and footer of every page.
// This only changes what's visible: the server checks the login itself
// on every request that needs it.
import { getCurrentUser, logout } from './api.js';
import { el } from './lib.js';

function renderLoggedIn(user) {
  const slot = document.querySelector('#auth-nav');
  const footerLogin = document.querySelector('#footer-login');
  if (footerLogin) footerLogin.hidden = true;
  if (!slot) return;

  const button = el('button', { type: 'button', class: 'link-button', text: 'Log out' });
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await logout();
    } finally {
      window.location.href = '/';
    }
  });

  slot.replaceChildren(
    el('span', { class: 'auth-nav__who', text: `Signed in as ${user.username}` }),
    button,
  );
}

// Returns the logged-in user, or null
export async function initSession() {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error(error);
  }
  if (user) renderLoggedIn(user);
  return user;
}
