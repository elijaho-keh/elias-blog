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
