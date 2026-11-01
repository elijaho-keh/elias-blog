# Architecture

How data flows between the visitor's browser, the Vercel functions, the Neon database, OpenRouter and the Cleveland Museum of Art.

## The big picture

```
                    ┌──────────────────────────── Vercel (Frankfurt) ───────────────────────────┐
┌───────────┐ pages │  public/  HTML, CSS, JS, images                                           │
│           │──────▶│                                                                           │
│  Browser  │       │  /api functions ──── SQL ($1, $2) over HTTPS ───▶  Neon Postgres          │
│           │ JSON  │   posts, post,                                      (AWS Frankfurt)       │
│ HTML + JS │◀─────▶│   comments,     ──── post text ─────────────────▶  OpenRouter → AI model  │
│  modules  │cookie │   login, logout,                                                          │
│           │       │   me, kindred   ──── keyword ───────────────────▶  Cleveland Museum of Art│
└───────────┘       │        ▲                                            Open Access API       │
      │             │   CDN cache (kindred answers kept 1 day)                                  │
      │             └───────────────────────────────────────────────────────────────────────────┘
      └──── artwork image ──▶ Cleveland Museum of Art image CDN
```

```mermaid
flowchart LR
  B["Browser<br/>HTML + vanilla JS"]

  subgraph V["Vercel · Frankfurt (fra1)"]
    S["Static files<br/>public/"]
    A["Serverless functions<br/>/api"]
    C[("CDN cache")]
  end

  N[("Neon Postgres<br/>AWS Frankfurt")]
  O["OpenRouter<br/>AI model"]
  M["Cleveland Museum of Art<br/>Open Access API"]
  MI["Museum image CDN"]

  B -->|"pages, CSS, JS, images"| S
  B <-->|"JSON + session cookie"| A
  A -->|"SQL with $1, $2"| N
  A -->|"post text → summary"| O
  A -->|"keyword → artwork"| M
  C -.->|"kindred answers, 1 day"| A
  B -->|"artwork image"| MI
```

**Who knows what**

| Part | Holds | Never sees |
|---|---|---|
| Browser | the pages and an `HttpOnly` session cookie that its JavaScript can't read | database address, API keys |
| Vercel functions | `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (environment variables) | the admin password |
| Neon | users (bcrypt hashes), sessions (SHA-256 hashes of tokens), posts, comments | plain passwords or plain session tokens |
| My computer | `.env` with everything, including `ADMIN_USERNAME` / `ADMIN_PASSWORD` for the seed script | – |

## Reading a post

```mermaid
sequenceDiagram
  participant B as Browser (post.html)
  participant A as Vercel /api
  participant N as Neon
  participant M as Cleveland Museum

  B->>A: GET /api/post?slug=amygdala
  A->>N: SELECT … FROM posts WHERE slug = $1
  N-->>A: the post row
  A-->>B: { post } (or 404)
  Note over B: renders title, AI summary, text, video with textContent

  par Kindred work
    B->>A: GET /api/kindred?q=eyes
    alt answer in CDN cache (1 day)
      A-->>B: cached { artwork }
    else not cached
      A->>M: search q=eyes, has_image, cc0
      M-->>A: matching artworks
      A-->>B: { artwork } (title, artist, date, image_url, url)
    end
    B->>M: load the artwork image from the museum's CDN
  and Comments
    B->>A: GET /api/comments?post=amygdala
    A->>N: SELECT … FROM comments WHERE post_id = $1
    A-->>B: { comments }
  end
```

## Logging in

```mermaid
sequenceDiagram
  participant B as Browser (login.html)
  participant A as /api/login
  participant N as Neon

  B->>A: POST { username, password } (JSON)
  A->>N: SELECT id, password_hash FROM users WHERE username = $1
  A->>A: bcrypt.compare (against a dummy hash if the user doesn't exist)
  alt wrong username or password
    A-->>B: 401 "Wrong username or password."
  else correct
    A->>A: token = 32 random bytes
    A->>N: INSERT INTO sessions (token_hash = SHA-256(token), expires in 7 days)
    A-->>B: 200 + session cookie (HttpOnly, Secure, SameSite=Strict)
  end
  Note over B,A: Later requests send the cookie. /api/me and requireUser()<br/>hash it and look up a session that hasn't expired.
```

## Publishing a post with an AI summary

```mermaid
sequenceDiagram
  participant B as Browser (new.html)
  participant A as POST /api/posts
  participant N as Neon
  participant O as OpenRouter

  B->>A: { title, category, cover_url, cover_alt, keyword, body } + cookie
  A->>N: requireUser(): look up the hashed session token
  alt no valid session
    A-->>B: 401 "You need to log in first."
  else logged in
    A->>A: validatePostInput(): 400 with per-field messages if something is wrong
    A->>N: INSERT INTO posts … ON CONFLICT (slug) DO NOTHING (tries title-2, title-3 …)
    Note over A,N: The post is saved before the AI is asked
    A->>O: chat completion: "summarize in two sentences" (8 s timeout)
    alt AI answered
      O-->>A: summary
      A->>N: UPDATE posts SET summary = $1 WHERE id = $2
    else AI failed, slow or no key
      A->>A: summary stays NULL (logged on the server)
    end
    A-->>B: 201 { post }
    B->>B: go to the new post's page
  end
```

## Adding a comment

```mermaid
sequenceDiagram
  participant B as Browser (comment form)
  participant A as POST /api/comments
  participant N as Neon

  B->>B: quick check: name and comment not empty
  B->>A: { post, name, body, website } (JSON, no login)
  A->>A: honeypot "website" filled? → 400
  A->>A: validate: name 1–60, comment 1–2000 characters
  A->>N: find the post by slug (404 if unknown)
  A->>N: INSERT INTO comments (post_id, name, body) VALUES ($1, $2, $3)
  A-->>B: 201 { comment }
  B->>B: add it to the list with textContent
```

## Searching and filtering

This happens entirely in the browser. The home page loads all posts once (`GET /api/posts`). After that, `home.js` filters the array on every keystroke or button press, with no new requests:

```
state = { posts, query, category }
        │
        ▼
posts.filter(post => matchesCategory(post, category) && matchesQuery(post, query))
        │
        ▼
render(): story list, "3 of 8 stories", button counts, URL ?q=…&category=…
```
