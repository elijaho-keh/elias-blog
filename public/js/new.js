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
const fileInput = document.querySelector('#cover-file');

// An image picked from the computer, shrunk and turned into a data URL.
// The text field only shows its file name.
let upload = null; // { label, dataUrl }

const MAX_SIDE = 1600;

function readForm() {
  const values = Object.fromEntries(FIELDS.map((name) => [name, form.elements[name].value]));
  if (upload && values.cover_url === upload.label) values.cover_url = upload.dataUrl;
  return values;
}

// Shrinks a picked image to at most 1600 px wide or tall and saves it as JPEG,
// so a big photo from a phone becomes a few hundred kilobytes.
async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

async function handleFile() {
  const file = fileInput.files[0];
  fileInput.value = '';
  if (!file) return;

  const error = document.querySelector('#cover_url-error');
  error.textContent = '';
  try {
    const dataUrl = await shrinkImage(file);
    upload = { label: `Uploaded: ${file.name}`, dataUrl };
    form.elements.cover_url.value = upload.label;
    preview.src = dataUrl;
    preview.hidden = false;
  } catch {
    error.textContent = 'That file could not be read as an image. Try a JPEG or PNG.';
  }
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
  if (upload && url === upload.label) return;
  upload = null;
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
  document.querySelector('#cover-upload-button').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFile);
  form.elements.body.addEventListener('input', updateWordCount);
  preview.addEventListener('error', () => {
    preview.hidden = true;
  });
}

init();
