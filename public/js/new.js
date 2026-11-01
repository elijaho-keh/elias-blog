// The "New story" page. Hiding the form from visitors is only for their
// convenience: the server refuses to save a post without a valid login.
import { createPost } from './api.js';
import { countWords, el, postUrl } from './lib.js';
import { initSession } from './session.js';

const FIELDS = ['title', 'category', 'cover_url', 'cover_alt', 'keyword', 'body'];

const form = document.querySelector('#post-form');
const status = document.querySelector('#write-status');
const loginNeeded = document.querySelector('#login-needed');
const formError = document.querySelector('#form-error');
const submitButton = form.querySelector('button[type="submit"]');
const preview = document.querySelector('#cover-preview');
const wordCount = document.querySelector('#body-count');

function readForm() {
  return Object.fromEntries(FIELDS.map((name) => [name, form.elements[name].value]));
}

// Shows the server's message under each field that needs fixing
function showFieldErrors(errors) {
  for (const name of FIELDS) {
    const message = errors[name] || '';
    document.querySelector(`#${name}-error`).textContent = message;
    form.elements[name].setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  const firstInvalid = FIELDS.find((name) => errors[name]);
  if (firstInvalid) form.elements[firstInvalid].focus();
}

function setBusy(isBusy) {
  submitButton.disabled = isBusy;
  submitButton.textContent = isBusy ? 'Publishing…' : 'Publish';
}

// Live preview of the cover image
function updatePreview() {
  const url = form.elements.cover_url.value.trim();
  const looksLikeImage = url.startsWith('/img/') || /^https?:\/\/\S+$/.test(url);
  if (looksLikeImage) {
    preview.src = url;
    preview.hidden = false;
  } else {
    preview.hidden = true;
  }
}

function updateWordCount() {
  const text = form.elements.body.value.trim();
  const words = text === '' ? 0 : countWords(text);
  wordCount.textContent = words === 1 ? '1 word' : `${words} words`;
}

async function handleSubmit(event) {
  event.preventDefault();
  formError.replaceChildren();
  showFieldErrors({});
  setBusy(true);

  try {
    const post = await createPost(readForm());
    window.location.href = postUrl(post.slug);
  } catch (error) {
    if (error.status === 400) {
      showFieldErrors(error.fields);
      formError.textContent = 'Please fix the fields marked in red.';
    } else if (error.status === 401) {
      // Logged out while writing: keep the text and let them log in elsewhere
      formError.replaceChildren(
        'Your login has run out. ',
        el('a', { href: '/login.html', target: '_blank', text: 'Log in again in a new tab' }),
        ', then press Publish again.',
      );
    } else {
      formError.textContent = 'The story could not be saved. Please try again.';
    }
    setBusy(false);
  }
}

async function init() {
  const user = await initSession();
  status.textContent = '';

  if (!user) {
    loginNeeded.hidden = false;
    return;
  }

  form.hidden = false;
  form.addEventListener('submit', handleSubmit);
  form.elements.cover_url.addEventListener('input', updatePreview);
  form.elements.body.addEventListener('input', updateWordCount);
  preview.addEventListener('error', () => {
    preview.hidden = true;
  });
}

init();
