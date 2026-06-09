---
name: studyverce-dashboard
description: StudyVerce dashboard shell — custom layout without global navbar, stat cards, quick actions, study calendar, and charts. Use when editing dashboard page, dashboard-shell, or dashboard components. Post-its are NOT on the dashboard.
---

# StudyVerce dashboard

## Layout

- `app/dashboard/layout.tsx` — full viewport shell
- `conditional-navbar.tsx` hides global navbar on `/dashboard`
- `dashboard-shell.tsx` — sidebar + main content area
- `dashboard-top-bar.tsx` — page header inside shell

## Content (`app/dashboard/page.tsx`)

- Stat cards (`dashboard-stat-card.tsx`) — sessions today, hours spent, streak + total focus, reminders (`reminders-today-stat.tsx` from notification inbox)
- Stats computed in `lib/dashboard/stats.ts` from `study_sessions` + `profiles` (meaningful sessions = `focus_minutes > 0`)
- Quick actions (`quick-actions.tsx`)
- Study calendar, charts — do not re-add post-it board here

## Study session data

Pomodoro focus in rooms persists via `hooks/use-study-session.ts` → socket `session:start` / `session:end` → `study_sessions` + `update_profile_stats`. Dashboard and leaderboard read these values.

## Styling

StudyVerce green theme; match existing dashboard components for new UI.

## Post-its

Task CRUD lives in `task-actions.ts` but notes render **only in rooms**. Dashboard may show stats derived from sessions, not post-it canvas.

## Skills maintenance

After dashboard layout or widget changes, update this skill, `studyverce-dashboard/reference.md` if present, and root `AGENTS.md`. See `.cursor/rules/skills-maintenance.mdc`.
