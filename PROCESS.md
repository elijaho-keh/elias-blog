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
