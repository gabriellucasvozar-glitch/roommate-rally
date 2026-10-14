# Accountability Rally (GitHub-only)
Static site on GitHub Pages. Data is stored as `data.json` in a second, **private** GitHub repo, read and written with one fine-grained access token from your account. No other services.

## 1. Create the two repos
1. **Site repo** (public, so free Pages works), e.g. `rally`: push all files from this folder.
2. **Data repo** (private), e.g. `rally-data`: create it empty with a README so the `main` branch exists. The app creates `data.json` on first save.

## 2. Create the single token
GitHub → Settings → Developer settings → Fine-grained tokens → Generate:
- Repository access: **Only select repositories** → `rally-data`
- Permissions: **Contents: Read and write** (nothing else)
- Set the longest expiry; note the renewal date.
Copy the token (starts `github_pat_`).

## 3. Configure
Edit `config.js`: set `github.owner` (your username) and `github.repo`; edit the four roommate names. These are public settings. **Never commit the token.**

## 4. Deploy
Site repo → Settings → Pages → *Deploy from a branch* → `main` / root. Site appears at `https://<user>.github.io/<repo>/`.

## 5. Each roommate (once per phone)
Open the URL, paste the token, pick your name; both are remembered on that device (*Switch* to change).
Home screen: iPhone Safari → Share → *Add to Home Screen*; Android Chrome → ⋮ → *Add to Home screen*.

## Notes and limits
- The token is saved in the phone's browser storage. Anyone with it can edit the data repo only, not your other repos. If it leaks, revoke it on GitHub and make a new one.
- Saves re-read the file first and retry on conflict, so simultaneous saves merge by record (last write wins per day/chore).
- Don't make the data repo public: it would expose your check-ins.
- Local test: `python3 -m http.server`, open localhost:8000.
