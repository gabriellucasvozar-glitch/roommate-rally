# Roommate Rally

A small shared accountability calendar for four roommates. Each roommate signs in with a private token, updates their own daily check-ins, sees the group leaderboard, and tracks their assigned next-cycle chores.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Replace each token with a long random value.
4. Set one `SHARED_TOKEN` for the household. All four phones use this same token; the dropdown identifies which roommate is being updated.
5. Run `npm install` and then `npm start`.
5. Open `http://localhost:3000`.

Generate one shared token with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

## Deploy

Push this folder to GitHub, then deploy it as a Node web service on Render, Railway, Fly.io, or another Node host. Set `TOKEN_A`, `TOKEN_B`, `TOKEN_C`, `TOKEN_D`, and `PORT` in the host's environment settings. GitHub Pages alone cannot run the server or shared database.

## Important

The tokens are bearer credentials: anyone who has a token can act as that roommate. Share them privately, rotate them if one is exposed, and do not commit `.env` or `data.sqlite`.

The app stores attendance, workouts, food check-ins, steps and chore completion in SQLite. With `SHARED_TOKEN`, everyone can update any roommate selected in the dropdown. This is intentional for a shared household board; keep the token private.
