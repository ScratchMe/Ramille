---
name: hzblj-skills-nextjs-routing
description: >-
  Next.js App Router patterns — route structure, layouts, server vs client components, dynamic routes, loading/error states, metadata, and navigation. Use when building or modifying routing. Triggers on: App Router, route, layout, server component, client component, dynamic route, loading.tsx, error.tsx, metadata, useRouter, Link.
disable-model-invocation: true
---

# Routing (Next.js App Router)

## Structure

- Use App Router (`app/` directory).
- Every route is a folder with `page.tsx`.
- Colocate route-specific components in the route folder.
- Shared components live outside `app/` in `src/components/`.

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Home /
├── (auth)/
│   ├── login/page.tsx      # /login
│   └── register/page.tsx   # /register
├── (main)/
│   ├── layout.tsx          # Shared layout for main pages
│   ├── dashboard/page.tsx  # /dashboard
│   └── settings/page.tsx   # /settings
└── profile/
    └── [userId]/page.tsx   # /profile/:userId
```

## Layouts

- Use `layout.tsx` for shared UI that persists across child routes (nav, sidebar, footer).
- Layouts do not re-render on route change - use this for expensive components.
- Root layout must contain `<html>` and `<body>`.
- Use route groups `(groupName)` to share layouts without affecting URL.
- Do not nest layouts deeper than necessary - max 3 levels.

## Server vs Client Components

- Default to Server Components. Add `'use client'` only when needed.
- Server Components: data fetching, static content, SEO-critical pages.
- Client Components: interactivity, event handlers, hooks, browser APIs.
- Keep `'use client'` boundary as low as possible in the component tree.
- Never mark a layout as `'use client'` unless absolutely required.

## Dynamic Routes

- Use `[param]` for dynamic segments.
- Use `[...slug]` for catch-all routes.
- Use `[[...slug]]` for optional catch-all.
- Always validate and type params.

```ts
type ProfilePageProps = {
  params: Promise<{ userId: string }>
}

export const ProfilePage = async ({ params }: ProfilePageProps) => {
  const { userId } = await params
}
```

## Loading & Error States

- Use `loading.tsx` for route-level Suspense fallback.
- Use `error.tsx` for route-level error boundary (must be `'use client'`).
- Use `not-found.tsx` for 404 pages.
- Keep loading states lightweight - skeleton over spinner.

## Metadata

- Export `metadata` object or `generateMetadata` function from `page.tsx` and `layout.tsx`.
- Every page must have `title` and `description`.
- Use `generateMetadata` when metadata depends on dynamic params.

```ts
export const generateMetadata = async ({ params }: ProfilePageProps): Promise<Metadata> => {
  const { userId } = await params

  return {
    title: `Profile ${userId}`,
    description: `User profile page`,
  }
}
```

## Navigation

- Use `<Link>` from `next/link` for all internal navigation.
- Use `useRouter()` from `next/navigation` for programmatic navigation.
- Prefetch is automatic for `<Link>` - do not disable unless justified.
- Use `redirect()` in Server Components for server-side redirects.
- Use `useRouter().replace()` after auth flow (no back to login).

## Rules

- Never use `pages/` directory - App Router only.
- Do not fetch data in Client Components if it can be done in Server Components.
- Keep route params serializable (string only from URL).
- Avoid passing data between routes via query params when server-side fetch is possible.
- Colocate route logic - do not scatter one route's files across the project.

<!-- Modifié pour Ramille par scripts/installer-un-plugin.mjs : noms préfixés par « hzblj-skills- » (champ name, renvois aux commandes) et liens relatifs recalculés, appel manuel seulement (disable-model-invocation ; user-invocable rétabli s’il était à false). Plug-in hzblj-skills 1.7.1 ; licence et provenance dans .claude/plugins-importes/hzblj-skills/. -->
