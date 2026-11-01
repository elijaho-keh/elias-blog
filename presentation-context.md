# Context for my presentation: "Dailies" blog project

*(Fill in the four lines under "About the presentation" before sending.)*

## About the presentation
- **Length:** ___ minutes
- **Format:** ___ (slides? live demo? both?)
- **Language:** ___ (English / Swedish)
- **What the teachers grade / want to see:** ___

## The project in one paragraph
**Dailies** is a behind-the-scenes blog about my own film, AI and art projects: the process, the ideas and the parts that didn't work. In film, *dailies* are the raw footage you watch at the end of each shooting day, before anything is fixed in the edit. I built it for the course **Programming & Methods** at Berghs School of Communication (individual project, aiming for **Pass with distinction**). I'm Elias Grünewald Dykert: filmmaker, painter and AI content engineering student at Berghs.

- **Live site:** https://elias-blog-xi.vercel.app
- **Code:** https://github.com/elijaho-keh/elias-blog (public)
- **My portfolio:** https://eliasdykert.se, where the images, videos and project texts came from

## Numbers
- 13 phases, 17 commits, one per phase plus fixes. The site was live from the first day, and every push deployed automatically.
- About 3,100 lines in total: 7 serverless functions (241 lines), 7 shared server modules (484 lines), 10 frontend JavaScript modules (891 lines), 951 lines of CSS, and 4 database tables.
- 8 seed posts (Film 4, AI 3, Art 1), written from my portfolio texts, 327–434 words each.
- No framework and no build step: plain HTML, CSS and vanilla JavaScript.

## Assignment requirements and how I met them
1. **Post listing and post pages:** cover, title, date, category and AI summary. Post pages have back links at the top and bottom, and a "story not found" page.
2. **Login and logout:** one author account, created by a seed script from environment variables. Passwords are hashed with bcrypt. Sessions are stored in the database, because serverless functions have no memory between requests. The cookie is `HttpOnly`, `Secure` and `SameSite=Strict`, and the database stores only a SHA-256 hash of the token.
3. **Add posts:** the server checks the login in the API itself (401 without a valid session), not just by hiding the form. Every field is validated on the server.
4. **Comments:** name and comment, no login needed, stored in Neon. A hidden "honeypot" field stops simple bots. Everything is shown with `textContent`, never `innerHTML`.
5. **AI summary:** two sentences, made when a post is published and stored in the database. The post is saved before the AI is asked, so it's kept even if the AI fails.
6. **Search and filter:** a live search, plus All / Film / AI / Art buttons with live counts. Vanilla JavaScript with a `state` object, a `CATEGORIES` array, and small functions and conditions. The filter is saved in the URL.
7. **External API:** a "Kindred work" box: an artwork from a museum's open collection that matches the post's keyword.
8. **Theme switcher:** light and dark with CSS variables. It follows the system setting, and the choice is saved in `localStorage` with no flash on page load.

## Tech stack
Vercel serverless functions in Node.js (Frankfurt) · PostgreSQL on Neon (Frankfurt) · `@neondatabase/serverless` · `bcryptjs` · Google Gemini API (`gemini-3.5-flash-lite`, free tier) · Cleveland Museum of Art Open Access API · GitHub and GitHub Desktop · built with Claude Code as an AI pair programmer, credited as co-author in the commits.

## Two changes from my original brief (good presentation material)
1. **Art Institute of Chicago → Cleveland Museum of Art.**
   - **Browser blocked:** the museum's firewall (Cloudflare) blocked the request from the page.
   - **Server got 403:** I moved the request to my own server, and it got 403 because of a single "ü" (Grünewald) in an HTTP header, which must be plain ASCII.
   - **Visitors still blocked:** the server got its data after that, but the museum still refused visitors who clicked through from the blog, on Wi-Fi and on mobile data.
   - **Decision:** I wouldn't work around a museum's deliberate protection. I switched to Cleveland's open, CC0 API and changed three keywords.
2. **OpenRouter → Google Gemini.** OpenRouter's website was down for maintenance when I needed the key, and the alternative was paying for credit. I switched to Gemini's free tier and kept OpenRouter in the code as an option.

## Problems I solved (pick the best for the story)
- **Neon's tool wrapped the database address in quotes.** That was harmless locally but would have broken the live site. I caught it by checking the copied value without ever displaying it.
- **`vercel link` added `.env*` to `.gitignore`,** which would also have hidden `.env.example`. I fixed it with an exception rule.
- **AI models tried:**
  - `gemini-2.5-flash-lite`: retired for new users
  - `gemini-3.5-flash`: came back empty, because it spent its answer budget "thinking"
  - `gemini-3.5-flash-lite`: works, 0.6–1.3 seconds per summary
- **The AI sometimes broke its own instructions or invented details.** It wrote "This post…", "astronauts" for Ackja and a "choir" that wasn't there. I tightened the prompt, re-ran bad summaries, and label summaries "AI summary" on the page.
- **The free tier's limit is 15 requests per minute.** My tests hit it once. The script logged the failure and continued.
- **A bug found in live testing:** a 412-character word with no spaces made the page 4,586 px wide on a phone. One CSS line fixed it (`overflow-wrap: anywhere`).
- **Security tests:**
  - posts with `<script>` and `<img onerror>` in the title and comments showed as plain text
  - an SQL injection string returned 0 rows
  - the API refused posts without a login (401)

## Code worth showing on a slide
**1. Never `innerHTML`: every piece of text goes in through `textContent`** (`public/js/lib.js`)
```js
export function el(tag, attributes = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    if (name === 'text') node.textContent = value;
    else if (name === 'class') node.className = value;
    else node.setAttribute(name, value);
  }
  node.append(...children.filter(Boolean));
  return node;
}
```

**2. The server checks the login, then saves, then asks the AI** (`api/posts.js`)
```js
const user = await requireUser(req, res);      // 401 if not logged in
if (!user) return;
// … validate every field …
const post = await createPost(values, user.id); // saved before the AI is asked
const summary = await trySummarize(post.body);  // null if the AI fails
if (summary) await updateSummary(post.id, summary);
```

**3. Parameterized SQL: user input never touches the query text** (`lib/db.js`, `lib/posts.js`)
```js
query('SELECT … FROM posts WHERE slug = $1', [slug]);
```

**4. Search and filter with arrays, objects, functions and conditions** (`public/js/home.js`)
```js
const state = { posts: [], query: '', category: 'All' };

function matchesQuery(post, query) {
  const words = normalize(query).split(/\s+/).filter((word) => word !== '');
  if (words.length === 0) return true;
  return words.every((word) => post.searchText.includes(word));
}

function filterPosts() {
  return state.posts.filter(
    (post) => matchesCategory(post, state.category) && matchesQuery(post, state.query),
  );
}
```

**5. Sessions: the cookie holds a token, the database only its hash** (`lib/auth.js`)
```js
const token = randomBytes(32).toString('base64url');
await query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
  [hashToken(token), userId, expiresAt.toISOString()]);
// cookie: HttpOnly, Secure, SameSite=Strict, 7 days
```

## Intentionally left out
Editing and deleting posts, sign-up and multiple authors, password reset, comment moderation, rate limiting, image uploads, rich text, pagination, and an automated test suite. Everything was tested by hand and with scripts, and the results are logged in PROCESS.md.

## Ideas for a live demo (in order)
1. The home page: scroll, search "memory", click Film, search something nonsense, click "Show all stories".
2. Open a post: the AI summary under the title, the video, the Kindred work box, then post a comment.
3. Switch dark and light mode.
4. Log in, click **Write**, publish a short post, and show the AI summary appear. Have a plan for deleting it afterwards.
5. Optional: show GitHub (README, commit history) and the architecture diagram.

## Design
Editorial and image-led. Instrument Serif headlines, Source Serif 4 body text, Inter for labels. Warm off-white paper with one red accent. Images are never cropped, and stories alternate left and right on desktop. It has its own identity, separate from my portfolio.
