# 🌍 Worldle — Deploy to Vercel

## Files in this folder
```
worldle-vercel/
├── api/
│   └── generate.js      ← Secure backend (hides your API key)
├── public/
│   └── index.html       ← The game
├── vercel.json          ← Routing config
└── README.md
```

---

## Deploy in 3 minutes

### Step 1 — Get a free Vercel account
Go to https://vercel.com and sign up (free, no credit card).

### Step 2 — Get your Anthropic API key
Go to https://console.anthropic.com → API Keys → Create Key.
Copy it (starts with `sk-ant-...`).

### Step 3 — Deploy
1. Go to https://vercel.com/new
2. Click **"Deploy without Git"** → drag and drop this entire `worldle-vercel` folder
3. Click **Deploy** and wait ~30 seconds

### Step 4 — Add your API key
1. In Vercel dashboard, go to your project → **Settings → Environment Variables**
2. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-your-key-here`
3. Click **Save**
4. Go to **Deployments** → click the 3 dots on your latest deploy → **Redeploy**

### Step 5 — Done! 🎉
Your game is live at `https://your-project-name.vercel.app`

---

## Custom domain (optional)
In Vercel → Settings → Domains → add your domain (e.g. `worldle.yourdomain.com`)

---

## How it works
- The game calls `/api/generate` (your secure backend)
- The backend adds your secret API key and calls Claude
- Your API key is NEVER exposed to players
- Today's word is cached in the player's browser so Claude is only called once per day per player
