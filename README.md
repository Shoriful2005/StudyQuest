# StudyQuest

Gamified study tracker. React + Vite + TypeScript + Tailwind + Supabase.

## 1. Database
Open Supabase > SQL Editor, paste `supabase/schema.sql`, Run.
(The first block drops tables from earlier StudyQuest versions. Delete it if you have data to keep.)

## 2. Run locally
```bash
npm install
npm run dev
```
The Supabase URL and publishable key are hardcoded in `src/integrations/supabase/client.ts`. No `.env` needed.

## 3. Deploy on Vercel
Import the repo, framework preset **Vite**, build `npm run build`, output `dist`. Nothing else to set.
`vercel.json` rewrites every path to `index.html` so `/studyquest-admin` works on refresh.

## 4. Supabase Auth settings
- Authentication > URL Configuration: set **Site URL** to your Vercel URL.
- For quick testing, Authentication > Providers > Email: turn off "Confirm email".

## 5. Become an admin
1. Sign up in the app with your email.
2. Run in the SQL Editor:
   `insert into public.admin_roles (user_id) select id from auth.users where email = 'you@example.com';`
3. Open `https://YOUR-SITE/studyquest-admin` and sign in. There is no link to it anywhere in the UI.

## How it works
- XP, streaks and badges are calculated by a database trigger when a session is inserted (`apply_session`), so students cannot edit them.
- Students can only update their own name, avatar and daily goal (column-level grants).
- Admin queries and RPCs (`admin_stats`, `admin_grant_xp`, `admin_set_badge`) check `is_admin()` on the server.
- Streak reminders: popup on open, then toast + browser notification at 5 pm, 8 pm, 10 pm while the app is open.
