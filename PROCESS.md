# Process log

Key decisions, problems and how they were solved, phase by phase. Written as the project was built, for the final presentation.

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
