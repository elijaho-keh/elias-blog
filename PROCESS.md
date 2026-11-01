# Process log

Key decisions, problems and how they were solved, phase by phase. Written as the project was built, for the final presentation. The README describes what the blog does; this file describes how it got there.

## At a glance

**Phases and commits:** setup → layout and seed content → database → reading posts from the database → login → writing posts → comments → search and filter → external API → AI summaries → theme → docs → deploy. Each phase is one commit, or two when something had to be fixed, and each push deployed automatically to Vercel.

**The decisions I'd defend in the presentation**
1. **No framework, no build step.** Every line can be explained, and the site loads quickly.
2. **Sessions in the database, not in memory.** Serverless functions don't keep memory between requests. The cookie holds a random token, and the database stores only its hash.
3. **The server checks everything.** The login check for writing posts is in the API, all input is validated on the server, and the database has its own `CHECK` constraints. Hiding the form in the browser is only a convenience.
4. **`textContent`, never `innerHTML`.** Tested with `<script>` and `<img onerror>` in titles and comments: they show up as plain text.
5. **The post is saved before the AI is asked.** A broken or slow AI can never cost me a post.
6. **Deploy early.** The live URL existed after phase 1, so problems showed up on the real site long before the deadline.

**The problems that taught me the most**
- Neon's CLI wrapped the connection string in quotes. That was harmless locally, but it would have broken Vercel, and I caught it by checking the copied value without printing it (phase 4).
- The Art Institute of Chicago's firewall blocked visitors arriving from the blog. A single "ü" in a header also caused a 403. I ended up switching to the Cleveland Museum of Art (phase 9).
- OpenRouter's website was down for maintenance exactly when the key was needed. The AI code was built and tested without a key, then I switched to Google Gemini's free tier and kept OpenRouter as an option (phase 10).
- `vercel link` silently added `.env*` to `.gitignore`, which would also have hidden `.env.example` from Git (phase 4).

**AI models**
- **For the summaries:** Google Gemini `gemini-3.5-flash-lite` (free tier). The comparison with the other models I tried is in phase 10.
- **For building the site:** Claude Code (Claude Opus 5.5) as a pair programmer. It's credited as co-author in the commits.

## Phase 0: Planning (1 Nov 2026)

**Decisions**
- Plain HTML, CSS and vanilla JavaScript on the frontend, Vercel serverless functions on the backend, PostgreSQL on Neon. No framework and no build step, so every line can be explained.
- Login sessions live in a `sessions` table, not in server memory. Each serverless function call can run on a fresh instance, so anything kept in memory disappears between requests.
- The session cookie holds a random token, but the database only stores a SHA-256 hash of it. If the database leaked, the hashes couldn't be used to log in.
- Neon runs in Frankfurt (AWS eu-central-1), and the Vercel functions are pinned to Frankfurt (`fra1`) in `vercel.json`, so each database query stays inside one region. Neon has no Stockholm region.
- Deploy early: GitHub gets connected to Vercel right after phase 1, so every push deploys automatically and problems show up early instead of the night before the deadline.
- The admin username and password only live in my local `.env`. The seed script that creates the account runs on my computer, so they never need to be stored in Vercel.

**Problems**
- The plan was to publish with the GitHub command-line tool (`gh`). I downloaded the Intel zip instead of the macOS installer, so `gh` was never installed. Switched to GitHub Desktop, which I already use and am logged in to: commits are made in the project, and I publish and push from GitHub Desktop.

## Phase 1: Setup

- `.gitignore` was created before the first commit and ignores `node_modules`, `.env`, `.env.local`, `.vercel` and `.DS_Store`.
- `.env.example` lists every environment variable with placeholder values only.
- Files the browser loads live in `public/`, the serverless functions in `api/`. Scripts, docs and backend helpers stay out of the public folder.
- `npm start` runs `vercel dev`, which runs the site and the functions locally the same way Vercel does. The script is called `start`, not `dev`, because `vercel dev` runs a project's `dev` script itself, so a `dev` script that calls `vercel dev` would call itself in a loop.
- Local scripts load `.env` with Node's built-in `--env-file` flag, so the project doesn't need the `dotenv` package.
- Published to GitHub with GitHub Desktop and imported into Vercel straight away. The first deploy only showed a placeholder page, but it proved the pipeline works.

## Phase 2: Layout and seed content

**Design**
- The blog is called *Dailies*. In film, dailies are the raw footage you watch at the end of each shooting day, before anything is fixed in the edit. That fits a blog about process and unfinished work.
- It has its own identity, separate from my portfolio. The portfolio uses Familjen Grotesk, Newsreader and IBM Plex Mono. The blog uses Instrument Serif for big headlines, Source Serif 4 for reading text and Inter for small labels, on warm off-white paper with one red accent colour.
- Images are never cropped. My covers range from 2.39:1 film stills to tall portrait paintings, and cropping a painting changes the work. Each image keeps its own shape, and the stories alternate image left / image right on desktop. On a phone, everything stacks in one column.
- All colours and fonts are CSS variables from the start, so the dark theme later only has to change the values.

**Content**
- Eight seed posts, one per portfolio project plus one about my hand-made art, 327–434 words each. They're based only on the texts on eliasdykert.se. Where the site says little, the writing stays with the idea behind the work and what can be seen in the images, instead of making up anecdotes. Every film post ends with the full credits from the portfolio.
- The publish dates (September–October 2026) are dates for the blog posts, not for when the projects were made.
- Videos are linked from eliasdykert.se/media instead of being copied into the repo (they are 5–11 MB each). Images were downloaded from eliasdykert.se/img into `public/img`.
- Each post has a keyword for the Art Institute of Chicago API. I tested the keywords against the API first. "piano" returned an architecture sketch by Renzo Piano, so the Flora post uses "pianist" instead.

**Code**
- All page text is created with a small helper, `el()`, that only uses `textContent`. No `innerHTML` anywhere, so text from posts or comments can never be read as HTML.
- All data loading goes through `public/js/api.js`. For now it reads a static `public/data/posts.json`. When the database is connected, only that file has to change.
- Loading, error and "story not found" states on both pages.

**Problems**
- Python's built-in web server wasn't allowed to read a folder on the Desktop (a macOS privacy setting), so the local preview uses a tiny Node server instead. It's only for previewing and isn't part of the project.
- On desktop, every other story puts its image on the right. At first those images ended up in the narrow column. Fixed by flipping the column widths on even rows.

## Phase 3: Database

**Setup with the Neon CLI**
- Neon's onboarding gives you a prompt for a coding agent. It used the Neon CLI: `neon init` linked this folder to my Neon project and created `neon.ts`, and `neon deploy` wrote the connection strings straight into `.env`. The database password never had to be copied by hand or shown on screen.
- `neon.ts` is Neon's config file. It keeps the production branch as it is, and any extra development branch I create deletes itself after 7 days.
- The project runs PostgreSQL 18 in AWS Frankfurt (eu-central-1), the same region as the Vercel functions.
- `neon init` also installed Neon's plugin and skills for coding agents (Claude Code, Codex, VS Code) on my computer. That's outside this project and isn't committed.

**Decisions**
- Driver: `@neondatabase/serverless`, as the brief specifies. Neon's own agent skill suggests `pg` with Vercel's Fluid compute for Vercel, but the serverless driver's HTTP mode means there's no connection to open, reuse or close: each function call sends its query over HTTPS. That's easier to explain and plenty fast for a blog.
- Neon gives two connection strings. The pooled one (`DATABASE_URL`) is for the app. The direct one (`DATABASE_URL_UNPOOLED`) is for schema changes, as Neon recommends.
- The schema lives in code (`scripts/schema.sql`) and is applied with `npm run db:schema`, in one transaction. It's safe to run again.
- The database guards its own data: a post's category must be Film, AI or Art, and comment names and bodies have length limits. Even if the API had a bug, Postgres would refuse bad rows.
- `npm run db:seed` creates the admin account (bcrypt, cost 12) and loads the eight posts. Running it again updates rows instead of duplicating them, keeps any AI summaries, and logs out old sessions in case the password changed.
- Every query goes through `query(text, params)` in `lib/db.js`, with `$1, $2` placeholders.

**Verified**
- `npm run db:check`: connected to `neondb` on PostgreSQL 18.6. Rows: 1 user, 8 posts (AI 3, Art 1, Film 4), 0 comments, 0 sessions. Running the seed twice still gives 8 posts.
- The password in `.env` matches the stored bcrypt hash, and the stored value is a hash, not the password.
- An SQL injection string (`flora' OR '1'='1`) sent as a parameter matched 0 rows.
- Inserting a post with the category "Music" was rejected by the database's check constraint.
- There is no `npm run build`: the project has no build step on purpose.

**Problems**
- `npm i -g neon` failed with a permissions error (global npm installs need admin rights on this Mac). Running it with `npx neon@latest` instead worked.
- The first `neon init` ran before I had signed in, so it only wrote the link file. After `neon login` in the browser, `neon deploy` connected and pulled the variables.
- My admin password contains special characters. I checked that Node reads it from `.env` exactly as typed before hashing it.

## Phase 4: Reading posts from the database

**What changed**
- Two serverless functions:
  - `GET /api/posts` returns every post, newest first.
  - `GET /api/post?slug=…` returns one post.
- Each answers with a clear status code: 200 for OK, 400 if the slug is missing, 404 for an unknown post, and 405 for a wrong method such as POST.
- Shared server helpers:
  - `lib/http.js`: the 405 answer, and a 500 answer that logs the real error on the server while the visitor only sees a general message, so database details never leak.
  - `lib/posts.js`: the post queries. They list their columns instead of using `SELECT *`, so internal columns like `author_id` stay out of the API.
- On the frontend, only `public/js/api.js` changed, exactly as planned in phase 2. The home page and post page code didn't need a single edit.
- The seed file moved from `public/data/posts.json` to `data/posts.json`. Only the seed script reads it now, and it's no longer a public URL.

**Running it locally**
- `npm start` runs `vercel dev`, which serves the pages and the `/api` functions together on http://localhost:3000 and reads `DATABASE_URL` from `.env`.
- This needed a one-time `vercel login` (approve a code in the browser) and `vercel link` to connect the folder to the Vercel project.

**Verified locally**
- `/api/posts` returned 8 posts in date order. `/api/post?slug=flora` returned the full post (346 words).
- Status codes: missing slug 400, unknown slug 404, the injection string `flora' OR '1'='1` 404, POST 405, the old `/data/posts.json` 404.
- In the browser, the home page made one request to `/api/posts` and showed all 8 stories. Clicking "Ackja: day 612" loaded `/api/post?slug=ackja` with credits, video and the back link. An unknown slug showed "That story could not be found." There were no console errors.

**Problems**
- `vercel link` added `.env*` to `.gitignore`. That's good for secrets, but it would also have hidden `.env.example` from Git. I rewrote `.gitignore` to ignore every `.env` file except `.env.example`, and checked each case with `git check-ignore`.
- The live site needs `DATABASE_URL` in Vercel's environment variables, otherwise `/api/posts` fails. It has to be added before this phase is pushed. The admin username and password are not needed on Vercel.
- Vercel's newer dashboard has no "Environment Variables" item in Settings. Variables live inside each environment: Settings → Environments → Production → Add.
- `neon deploy` wrote the connection strings into `.env` wrapped in quotes. Node strips the quotes, so everything worked locally, but pasted into Vercel the quotes would have become part of the value and broken the connection. Caught this by checking the copied value (only yes/no checks, never printing it) and re-copied it without quotes.

## Phase 5: Login and logout

**How it works**
- `POST /api/login` checks the username and password with bcrypt. On success it creates a random 32-byte token, stores only its SHA-256 hash in `sessions` with an expiry 7 days ahead, and sends the token in a cookie.
- The cookie is `HttpOnly` (page JavaScript can't read it, so a script injected into the page couldn't steal it), `Secure` (HTTPS only; left out on localhost, which is plain HTTP), `SameSite=Strict` (never sent along with requests that start on another site) and `Path=/`.
- `GET /api/me` looks the hashed token up and only accepts a session that hasn't expired. `POST /api/logout` deletes the session row and clears the cookie.
- `lib/auth.js` has a `requireUser()` helper that answers 401 when nobody is logged in. Phase 6 uses it to protect writing posts on the server.
- The header shows "Signed in as … / Log out" when you're logged in. The footer has a small "Author login" link, since there's no public sign-up.

**Security details**
- The error message is the same for a wrong username and a wrong password. When the username doesn't exist, the password is still compared against a dummy bcrypt hash, so the response time doesn't reveal which usernames exist.
- The login API only accepts JSON (`415` otherwise). An ordinary HTML form on another website can't send JSON, which adds a second layer of protection against cross-site requests on top of `SameSite=Strict`.
- Logout is a POST, so a link or image on another site can't log you out.
- After logging in, `?next=` can only send you to a page on this site, never to another website.
- Expired sessions are cleaned up at every login.

**Verified locally** (with a temporary test account, deleted afterwards)
- Wrong method 405, form data instead of JSON 415, missing password 400, unknown username 401, wrong password 401. The last two return the same message.
- Correct password: 200 with a cookie flagged `HttpOnly; SameSite=Strict; Max-Age=604800`. On the live domain the same code adds `Secure`.
- The database stores the SHA-256 hash of the token, never the token itself. The session expires in 7 days. A made-up cookie gives `user: null`.
- After logout, the old cookie no longer works and the session row is gone.
- In the browser: a wrong password shows "Wrong username or password.", clears the password field and puts the cursor back in it. The right password leads to the home page with "Log out" in the header and the footer login link hidden. `document.cookie` can't see the session cookie. Clicking "Log out" returns to the logged-out state.
- I tested with a separate temporary account instead of my real admin password, then deleted it. Afterwards: 1 user, 0 sessions.

## Phase 6: Writing posts

**How it works**
- `POST /api/posts` creates a post in three steps:
  1. `requireUser()` checks the session cookie against the database and answers 401 if nobody is logged in.
  2. `validatePostInput()` checks every field.
  3. `createPost()` saves it.
- The login check happens on the server, so hiding the form in the browser is only a convenience. Calling the API directly without a valid session still gets 401.
- Validation lives on the server, which is the one place that can't be skipped:
  - The title is 3–120 characters, the category must be Film, AI or Art, the text at least 100 characters, and the keyword 2–60 characters.
  - The cover image must be a link that starts with `https://`, `http://` or `/img/`. That blocks values like `javascript:…`.
  - Each problem comes back with a message for that field, and the form shows it under the right field.
- Slugs come from the title: "Röktanke: a prompt!" becomes `roktanke-a-prompt`. If a slug is already taken, the server tries `-2`, `-3` and so on, using `ON CONFLICT DO NOTHING`.
- The "New story" page has a live cover preview, a list of the site's own images to pick from, and a live word count. Hints ask for an image description (alt text) and explain that the keyword is used to find a related artwork.
- When logged in, the header shows "Write". If the session runs out while writing, the text stays in the form and a link opens the login in a new tab.

**Verified locally** (temporary test account and test posts, all deleted afterwards)
- POST without a cookie: 401. With a made-up cookie: 401.
- Logged in: form data instead of JSON 415. An empty form returns 400 with five field messages. A `javascript:` cover returns 400. Category "Music" returns 400.
- A valid post returns 201. Posting the same title again gave the slug `…-2`.
- **XSS test:** a post titled `<script>alert("xss")</script> Test story`, with `<b>` and `<img onerror=…>` in the text and in the alt text, shows all of it as plain characters on the page. No script ran, and there are 0 `<script>`, `<b>` or `<img>` elements inside the article. This is what rendering with `textContent` instead of `innerHTML` buys.
- In the browser: logged out, `/new.html` shows "You need to be logged in" instead of the form. Logging in through `/login.html?next=/new.html` leads straight back to the form. An empty submit marks five fields in red and moves the cursor to the title. A filled-in form shows the cover preview and word count, publishes, opens the new post (three paragraphs, credits, alt text), and the post appears first on the home page.
- Clean-up: 3 test posts and the test user removed, leaving 1 user, 8 posts and 0 sessions.

**Note:** the console shows a 401, a 400 and a 404 during testing. They come from the deliberate wrong password, the deliberately empty form and the deliberately wrong post address. The browser logs every failed request, even when the page handles it.

## Phase 7: Comments

**How it works**
- `GET /api/comments?post=slug` returns a post's comments, oldest first, so they read like a conversation. `POST /api/comments` adds one with a name and a comment. No login is needed.
- The server checks everything again, whatever the browser did:
  - name 1–60 characters, comment 1–2,000 characters (the database has the same limits as `CHECK` constraints)
  - the post must exist (404 otherwise)
  - JSON only (415 otherwise)
- Line breaks in comments are kept with CSS `white-space: pre-line` instead of turning them into `<br>` tags, so the text can stay plain `textContent`. Windows line endings are normalised, and runs of empty lines are shortened to one.
- **Spam trap (honeypot):** the form has a hidden "Website" field. People never see it, because it's moved off-screen and skipped by Tab and by screen readers. Bots fill in every field, so a filled-in "Website" means the comment is rejected.
- The browser does a quick empty-field check first, so an empty form never reaches the server. The new comment appears straight away, the counter updates, and the name stays filled in for the next comment.

**Verified locally** (test comments deleted afterwards)
- Unknown post 404, wrong method 405, form data 415, empty fields 400 (two field messages), too long 400 (two field messages), honeypot filled 400, valid 201.
- `"  First line.\r\n\r\n\r\n\r\nAfter many empty lines.  "` was saved as `First line.\n\nAfter many empty lines.`
- **XSS test:** a comment with the name `<img src=x onerror=alert(1)>` and the text `<script>alert("comment")</script>` shows as plain characters. 0 injected elements on the page, nothing ran.
- In the browser at phone width (373 px): an empty submit showed "Add your name." and "Write a comment." without sending a request. Posting worked: "Comments (3)", a thank-you message, the comment box cleared. After a reload the comment was still there, and there was no sideways scrolling.
- Clean-up: 3 test comments deleted, leaving 0 comments, 8 posts and 1 user.

## Phase 8: Search and category filter

**How it works** (all in `public/js/home.js`, vanilla JavaScript)
- The page loads every post once. After that, searching and filtering happen in the browser without any new requests.
- **Object:** a single `state` object holds everything the page needs to draw itself: `{ posts, query, category }`. Every change goes through `update(changes)`, which updates the state and redraws, so the page can't get out of sync.
- **Arrays:** `CATEGORIES = ['All', 'Film', 'AI', 'Art']`. The buttons are built from that array with `map()`, and the visible posts come from `posts.filter()`.
- **Functions and conditions:**
  - `matchesCategory()`: "All" lets everything through, otherwise the category must match.
  - `matchesQuery()`: every word in the search must appear in the title, text or summary (`every()`), so "piano stage" only finds posts with both words.
  - `normalize()`: removes accents and capital letters, so "roktanke" finds "Röktanke".
  - `countByCategory()`: counts the matches in each category, so the buttons show live numbers such as "Film 4".
- The searchable text for each post is prepared once at load, not on every keystroke.
- The search and the category are saved in the address bar (`?q=memory&category=AI`) with `history.replaceState`, so a filtered view survives a reload and can be shared as a link. Unknown categories in the address fall back to "All".
- When nothing matches, a message names the search and category, with a "Show all stories" button that resets both and puts the cursor back in the search box.
- Accessibility: the buttons use `aria-pressed`, the search box has a label for screen readers, and the "4 of 8 stories" counter is announced when it changes.
- Story titles in the list changed from `h2` to `h3`, because they sit under the "Stories" `h2`.

**Verified in the browser**
- On load: "All 8, Film 4, AI 3, Art 1" and "8 stories".
- Film: 4 Film posts, "4 of 8 stories", address `?category=Film`.
- Film + "roktanke": "No stories match “roktanke” in Film." The buttons showed "All 2, AI 1, Art 1", because "Made by hand" mentions Röktanke too.
- "Show all stories": back to 8, search box empty and focused, address cleared.
- "piano stage" gave only "Flora: a piano trio on an empty stage".
- Opening `?q=memory&category=AI` restored the search and button and showed 2 posts. `?category=Nonsense` fell back to All.
- No sideways scrolling at 373 px. On desktop the buttons sit on the left and the search on the right.

## Phase 9: Kindred work (external API)

**What it does**
- Each post page shows a "Kindred work": an artwork that matches the post's keyword, with the image, title, artist, date and a link to the artwork's page at the museum.
- It ended up using the **Cleveland Museum of Art's Open Access API** (`openaccess-api.clevelandart.org`, no key needed). The brief named the Art Institute of Chicago. Why that changed is explained under "Problems" below.

**How it works** (`lib/kindred.js`, `api/kindred.js`, `public/js/kindred.js`)
- The page asks our own `GET /api/kindred?q=keyword`, and the serverless function asks the museum. The function returns a small, ready-made card (title, artist, date, image link, alt text, artwork link) instead of the museum's full response.
- Only works with an image and a **CC0** licence are requested (`has_image=1&cc0=1`). The museum has released those images for anyone to use, so showing them on the blog is allowed.
- Artist names are cleaned up: "Maurice Denis (French, 1870–1943)" becomes "Maurice Denis". Works with no known artist show their culture instead, for example "Southern Germany, 15th century".
- Vercel's CDN keeps each answer for a day (`Cache-Control: s-maxage=86400`), so the museum gets about one request per keyword per day, however many people read the post. Failures aren't cached (502 + `no-store`), so the next visitor gets a fresh try.
- **States:**
  - Loading: a pulsing placeholder and "Looking for a work that matches …". The pulse stops if the visitor has asked for reduced motion.
  - Found: the artwork card.
  - Not found: a short message.
  - Error or timeout: "couldn't be reached right now" with a "Try again" button. The server stops waiting after 8 seconds (`AbortSignal.timeout`).
- If the image itself fails to load, the card shows the text only, instead of a broken image icon.

**Problems: why the Art Institute of Chicago didn't work**
1. **Blocked in the browser.** The first version fetched `api.artic.edu` straight from the page. The API itself allows that (CORS `*`), but in my Chrome the box said "couldn't be reached". The museum sits behind Cloudflare's firewall. Typing their API link or image link into the address bar worked, but requests made from the blog page were refused. The firewall also blocks the automated test browser used during development completely.
2. **Moved to the server, then one letter broke it.** I moved the request into our own serverless function (`/api/kindred`). The museum asks developers to identify their app with an `AIC-User-Agent` header, so the function sent one. It got 403. The cause was the "ü" in "Grünewald": HTTP headers must be plain ASCII, and the firewall rejected the header as "malformed data". I tested the same request from the terminal with and without the ü: 403 with it, 200 without. Writing "Grunewald" fixed it, and the server got its data.
3. **Visitors still blocked.** The artwork image and the "See it at the Art Institute" link go from the visitor's browser straight to artic.edu, and the museum refused those too. That happened in Chrome on Wi-Fi and on my phone on mobile data, with "Sorry, you have been blocked". So the box showed text but no image, and the link led to a block page.
4. **Decision.** Getting around a museum's deliberate protection, for example by hiding where visitors come from or by pretending to be a normal browser, isn't acceptable. I switched to the Cleveland Museum of Art's open API, which I first tested from the live site: both the search and the image loaded. It also needs no key, and its images are CC0.
5. **Three keywords had to change**, because the matching modern works in Cleveland's collection aren't CC0:
   - Amygdala: `neon` → `eyes` gives Odilon Redon, *Closed Eyes* (1890). A face with closed eyes suits a film about memory.
   - Ackja: `astronaut` → `comet` gives Albrecht Dürer, *Melencolia I* (1514). Melancholy under a comet suits 612 days in space.
   - AI World Building: `Martin Parr` → `seaside` gives James Tissot, *Seaside (July: Specimen of a Portrait)* (1878). A fashionably dressed woman by the sea is close to the Martin Parr photo the project rebuilt.

   I changed them in `data/posts.json` and in the database with one parameterised `UPDATE` per post, in a single transaction. That way the seed script didn't need to run again, which would have logged me out.

**Verified**
- `/api/kindred` locally, for every post:

  | Post | Keyword | Artwork |
  |---|---|---|
  | AI World Building | seaside | James Tissot, *Seaside* (1878) |
  | Röktanke | man smoking | David Teniers, *Peasants Smoking in an Inn* (c. 1640) |
  | Made by hand | expressionist portrait | Paula Modersohn-Becker, *Seated Female Nude (Self-Portrait?)* (c. 1899) |
  | The False Keeper | memory | Marguerite Zorach, *The Family (In Memory of a Summer…)* (1917) |
  | Amygdala | eyes | Odilon Redon, *Closed Eyes* (1890) |
  | Flora | pianist | Maurice Denis, *Eva Meurier in a Green Dress* (1891) |
  | Ackja | comet | Albrecht Dürer, *Melencolia I* (1514) |
  | Terapisamtalet | couple | *A Bridal Couple*, Southern Germany (c. 1470) |

- A nonsense word gives `null` and the "no match" message.
- In the browser, the Amygdala page shows *Closed Eyes* with its image (693×893), title, artist, date, the link to clevelandart.org and the credit line.

## Phase 10: AI summaries

**How it works** (`lib/ai.js`)
- When a post is created, `POST /api/posts` sends its text to **OpenRouter**, which gives one API for many AI models, and stores a two-sentence summary in `posts.summary`. The model is chosen with the `OPENROUTER_MODEL` env var.
- **The post is saved before the AI is asked.** If the AI is slow (8-second limit), down, out of credit or the key is missing, `trySummarize()` returns `null` and the post is still saved, just without a summary. The home page then shows the first lines of the text instead.
- The prompt asks for exactly two sentences, at most 45 words, in the present tense and a neutral voice (no "I", no "the author"), using only facts from the post. The answer is cleaned up: one line, no wrapping quotation marks, at most 400 characters.
- On the post page, the summary sits under the title, labelled **"AI summary"**, so readers know a machine wrote it and not me.
- `npm run ai:summaries` fills in summaries for posts that don't have one, including the eight seed posts. `-- --all` redoes every post, and `-- --dry-run` shows the results without saving, which is handy for comparing models.
- The seed script never overwrites existing summaries.

**Choosing a model** (OpenRouter's prices, 1 November 2026, per million tokens)
- Default: `anthropic/claude-haiku-5.5` at $0.10 in and $0.50 out. One summary is about 600 tokens in and 60 out, so roughly $0.0001, and $1 covers about 10,000 summaries. It's new and good at short, careful writing.
- Cheaper candidates to compare: `google/gemini-2.5-flash-lite` ($0.10 / $0.40) and `mistralai/mistral-small-3.2-24b-instruct` ($0.075 / $0.20).

**Problem**
- openrouter.ai's website was down for maintenance when I wanted to create the API key. So the code was written and tested first, and the key comes later. OpenRouter's API itself still answered: a made-up key got a clean "401 User not found".

**Verified without a key**
- `npm run ai:summaries` stops with "Add OPENROUTER_API_KEY to .env first." (exit code 1).
- `summarize()` without a key throws "OPENROUTER_API_KEY is not set". With a made-up key, OpenRouter answers 401, and `trySummarize()` logs it and returns `null` in about 0.2 seconds.
- Creating a post through the API without a key: 201 Created, saved in the database with `summary: null`. The test post and test account were deleted afterwards (8 posts, 1 user).

## Phase 11: Light and dark theme

**How it works**
- Phase 2 already defined every colour as a CSS variable (`--paper`, `--ink`, `--accent` and so on), so the dark theme only redefines seven values. No other CSS changed.
- With no saved choice, the site follows the visitor's system setting (`prefers-color-scheme`).
- The ☾ / ☀ button in the header switches theme, sets `data-theme` on `<html>`, and saves the choice in `localStorage`. CSS gives `data-theme` priority over the system setting.
- **No flash:** a few lines of inline script in each page's `<head>` apply the saved theme before the page is drawn, so a dark-theme visitor never sees a white flash on load.
- `localStorage` can be blocked, for example in some private windows. Every read and write is wrapped in `try/catch`, so the button still works for the current page.
- The dark colours were checked for contrast: grey text on the dark background is about 6:1, and the red accent is lightened to `#f07a5e` so it stays readable.
- The button has an `aria-label` ("Switch to dark theme"). On phones it shows only the icon, so the header doesn't wrap.
- `color-scheme: dark` makes the browser's own parts, such as form fields and scrollbars, dark too.

**Verified in the browser**
- With no saved choice and the system in dark mode, the page opened dark (`rgb(20, 19, 17)`) with the button saying "Switch to light theme".
- Clicking it saved `light` and turned the background `rgb(244, 241, 234)`. Going to a post page kept it light.
- Switching back to dark saved `dark`. The Kindred work box, the comment form and the login page all read well in dark.
- No console errors, no sideways scrolling at 373 px.

## Phase 12: Documentation

- **README.md:** what the blog is, a feature table mapped to the assignment's eight tasks, the tech stack, the project structure, how to run it locally, how to set up Neon, OpenRouter and Vercel (placeholders only), every environment variable, the database schema, the API endpoints, the security measures and what was intentionally left out.
- **docs/architecture.md:** the data flow between the browser, the Vercel functions, Neon, OpenRouter and the Cleveland Museum of Art. There's a plain-text diagram that reads anywhere, a Mermaid diagram that GitHub draws, a "who knows which secret" table, and step-by-step diagrams for reading a post, logging in, publishing with an AI summary and commenting.
- **PROCESS.md:** an "At a glance" section at the top, as a starting point for the presentation.

### Phase 10, part 2: switching to Gemini

**Why:** openrouter.ai stayed in maintenance, and the alternative was to pay for credit. Google's **Gemini API** has a free tier, and getting a key took about two minutes with a Google account. `lib/ai.js` now supports both providers with the same request format (OpenAI-style "chat completions"): Gemini is used when `GEMINI_API_KEY` is set, otherwise OpenRouter. Nothing else in the app changed.

**AI models tried**

| Model | Result |
|---|---|
| `gemini-2.5-flash-lite` | 404: "no longer available to new users". Google pointed to the newer model. |
| `gemini-3.5-flash` | Came back empty. It's a "thinking" model, and the 160-token limit was spent on thinking before it wrote anything. |
| **`gemini-3.5-flash-lite`** | **Chosen.** Two clean sentences in 0.6–1.3 seconds per post. |
| `anthropic/claude-haiku-5.5` via OpenRouter | Planned first choice. Not tested, because OpenRouter's site was down. The code is still there. |

**What I learned from the output**
- The first run broke the prompt's own rule twice: summaries started with "The text introduces…" and "This post showcases…". I made the rule stricter ("start directly with the subject; never write 'this post', 'the text'…") and checked every summary.
- The model sometimes adds details that aren't in the text. For Ackja it wrote "astronauts", and for a test post about filming rehearsals it invented a "choir". For the seed posts, I re-ran a summary until it no longer contained a word that wasn't in the post. That's why the post page labels summaries "AI summary": they're helpful, not authoritative.
- The free tier allows **15 requests per minute**. My test runs hit that limit once ("429 quota exceeded"). The script logged the failure and carried on, and a second run a minute later filled in the missing summary.

**Verified**
- All 8 seed posts have a summary. Publishing through `POST /api/posts` returned 201 in 1.3 seconds with a summary saved in the database (test post and test account deleted afterwards).
- The post page shows the summary under the title, labelled "AI summary".

### Bug found while testing on the live site

- **Problem:** my first live test post had a body that was one 412-character "word" with no spaces. Nothing in the CSS allowed a word to break, so the post page became 4,586 px wide on a 373 px phone screen, and the home page 3,891 px, through the excerpt. The same would happen with a long pasted link.
- **Fix:** one line on `body`: `overflow-wrap: anywhere`. A word only breaks when it can't fit on its own line, so normal text is unaffected. Both pages measured 373 px wide afterwards.
- That post also got no AI summary. The text was gibberish, so the model's answer failed the "too short" check, and the post was saved without one, as designed. I deleted the test post afterwards.
