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

- Stat cards (`dashboard-stat-card.tsx`) — e.g. sessions today
- Quick actions (`quick-actions.tsx`)
- Study calendar, charts — do not re-add post-it board here

## Styling

StudyVerce green theme; match existing dashboard components for new UI.

## Post-its

Task CRUD lives in `task-actions.ts` but notes render **only in rooms**. Dashboard may show stats derived from sessions, not post-it canvas.
