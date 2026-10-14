# Roommate Rally — GitHub Pages edition

This is a no-build static site based on the uploaded `otfeed` template. GitHub Pages hosts the interface; Supabase stores the shared weekly inputs so all four phones see the same data.

## One-time setup

1. Create a free Supabase project at [supabase.com](https://supabase.com).
2. In Supabase, open **SQL Editor**, paste `supabase-schema.sql`, and run it.
3. Copy `assets/config.example.js` to `assets/config.js`. Put in the Supabase project URL, the **anon/public** key, a long shared token, and the four names.
4. Upload the contents of this folder to the root of your GitHub repository. Keep `index.html` at the root. Commit to `main`.
5. In GitHub open **Settings → Pages → Deploy from a branch → main → /(root)**. After GitHub publishes, open the URL it gives you.
6. Enter the shared token, choose the roommate name, and add the page to each phone's home screen.

The site is intentionally account-free. The token is a shared convenience passcode, not a security boundary: GitHub Pages is public and the browser must receive the token. Use a random passphrase and do not put a Supabase service-role key in the file; only the anon key belongs here.

## Weekly operation

Each person opens **My week**, chooses their name, records attendance, workouts, clean-food days, and daily steps, then presses **Save week**. **Group progress** shows color-coded bars for everyone. **Chore board** shows the current cycle; the group can assign chores in Supabase or add a small assignment UI later. The rules shown in the app are school = 4 points, workout/food = 2, steps = 1, with a 63,000-step weekly target after the 10% discretion band and an 8-point monthly escalation threshold.
