# Design system

The component layer is [shadcn/ui](https://ui.shadcn.com) on **Base UI**
primitives, styled with Tailwind v4 theme tokens.

Components are **copied into this repo**, not installed from a package. Once
`components/ui/*` exists it is our source and we own it. That matters here:
the project transfers to the client at cutover and may be picked up by a
different developer, so there is no vendor upgrade treadmill to inherit.

---

## Where the boundary sits

**Primitives everywhere. Bespoke treatment on the public site.**

`components/ui/*` is used across the whole application — public site, auth,
member portal and admin alike. Drawing a hard component boundary at the
portal edge would mean a second Button, a second Input and a second set of
form validation for the public contact form (M6-05). One small form is not
worth two component systems.

What stays bespoke is the public site's **layout and visual treatment**:

| Area                       | Treatment                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Public site                | Custom layout, hero, identity strip, three-up, Business Agent card. Uses `components/ui/*` for controls only. |
| Auth, member portal, admin | shadcn patterns throughout — tables, dialogs, forms, toasts.                                                  |

The reason for the split is SPEC.md §1: the public site has to _"look
credible and make the local hireable"_ to venues and promoters. A default
component look undercuts that. The portal has the opposite requirement —
officers and members need something legible and predictable, and invention
there is a cost, not a feature.

This is a theming decision, not a dependency decision.

---

## Tokens

Theme tokens are CSS variables in `app/globals.css`, exposed to Tailwind
through `@theme inline`. Colours are `oklch`.

**Use token classes, never raw values.** `bg-primary`, not `bg-blue-600`.
`p-4`, not `p-[13px]`. If a value is not on the scale, the scale is the thing
to change — in review, deliberately.

### Fonts

`--font-sans` maps to Geist, loaded by `next/font` in `app/layout.tsx` as
`--font-geist-sans`.

> `shadcn init` wrote `--font-sans: var(--font-sans)`, a circular reference
> that silently fell back to the browser default font. It is now wired to
> `--font-geist-sans`. Worth knowing if a future `shadcn init` or preset
> change reintroduces it.

### Dark mode

Class-driven: `@custom-variant dark (&:is(.dark *))`. It does **not** follow
the operating system, which replaced the scaffold's original
`prefers-color-scheme` behaviour.

Nothing applies `.dark` today, so the application is light-only. That is
deliberate for now — a dark theme is a decision to make once, with the
client, rather than a default inherited from a scaffold.

---

## Adding components

```bash
npx shadcn@latest add <component>
```

Add components when a screen needs one, not in anticipation. The current set
is deliberately small: `button`, `input`, `label`, `card`, `table`, `dialog`,
`sonner`.

Notable deferrals:

- **`form`** pulls in react-hook-form and zod. It lands with the first real
  form (M2-03 sign-in), not before.
- **`<Toaster />`** is not mounted anywhere yet. It belongs in the portal
  shell (M5-01), whichever layout first needs a toast.

There are also prebuilt login blocks in the registry (`@shadcn/login-01`,
`@shadcn/login-04`) worth looking at for M2-03.

---

## Linting the design system

`@shadcn/lint` (M0-08) enforces these rules mechanically rather than by
convention. It reads the CVA variants in `components/ui/*` and the theme
tokens, so its errors name the correct fix instead of merely refusing.

It starts at `warn` and is not a merge gate. See issue #45 for the promotion
plan and for what it cannot catch — plain CSS, `@apply`, and newly added
tokens are all invisible to it. **Reviewing new tokens and variants stays a
human job.**
