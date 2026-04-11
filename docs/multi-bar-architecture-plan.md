# Multi-bar architecture & product plan

This document captures goals, data-model directions, phased delivery, and **resolved / expanded open decisions** for bar-scoped admin, multi-bar access, menu enforcement, catalog curation, and favorites.

---

## Goals (summary)

1. **Bar-specific admin** — Admin capabilities are tied to membership in a bar, not a single global `profiles.role`.
2. **One account, many bars** — Invites / access so users do not need separate logins per venue.
3. **Bar-specific ordering** — Checkout only allows cocktails that bar has listed on its menu.
4. **Owner catalog UI** — Browse the full cocktail list from admin, include/exclude on the bar menu, with bulk toggle (e.g. “all in current filter”).

---

## Recommended dependency order (implementation phases)

| Phase | Focus | Unlocks |
|------|--------|--------|
| 1 | **Menu junction** (`bar_cocktails` or equivalent) + migrate existing “this bar’s cocktails” | §3 menu enforcement, §4 admin catalog |
| 2 | **RLS + queries** — public/menu reads via junction; cart validation against menu | Safe ordering |
| 3 | **`bar_members` + bar-scoped admin** — replace global admin checks for bar operations | §1 |
| 4 | **Admin catalog UI** — toggle one / toggle all (filtered set) | §4 UX |
| 5 | **Invite links + membership** — access grant on login/register from link | §2 |
| 6 | **Favorites** — global + per-bar tables and Profile UI (two tabs) | §2 / UX |

Phases 1–2 align with **resolved decision 1 (A1)** below.

---

## Resolved decision 1 — Global catalog (**A1**)

**Chosen:** **Option A (junction menu) + variant A1.**

- **`cocktails.bar_id IS NULL`** → row is in the **global template pool** (shared catalog). Bars add drinks to their menu via **`bar_cocktails`** only for these (and optionally future rules for bar-private rows).
- **`cocktails.bar_id` non-NULL** → reserved for **legacy migration**, **bar-owned drafts**, or recipes that must not appear in the global pool until promoted; implementation should define whether bars may junction to non-global rows (e.g. “own bar only”).
- **`bar_cocktails`** (`bar_id`, `cocktail_id`, `active`, …) is the **menu**; patron-facing and cart validation use this junction.

**Implementation notes:** Migrate existing per-bar cocktail rows by either setting **`bar_id = NULL`** and backfilling **`bar_cocktails`**, or keep historical `bar_id` until cleaned up. RLS for **insert/update/delete** on global templates typically restricts to **`superadmin`** or a controlled process; bar staff manage **junction + bar-scoped content** only.

---

## Open decision 1 — Global catalog vs per-bar cocktails (expanded, background)

Today, `cocktails` rows carry `bar_id`: each cocktail “belongs to” one bar. That matches a **per-bar catalog** but makes a **shared library** awkward: every bar would duplicate rows to offer the same recipe, and “browse full list and include” implies either duplication or a second concept.

### Option A — **Junction menu (recommended)**

- **`cocktails`** holds **canonical** recipes (see sub-options below for `bar_id`).
- **`bar_cocktails`** (`bar_id`, `cocktail_id`, `active`, optional `sort_order`, future `price_override`, etc.) defines **what this bar sells**.
- **Patron-facing lists** = join `cocktails` ⋈ `bar_cocktails` for `current_bar_id` and `active = true`.
- **Admin “full catalog”** = all `cocktails` the platform (or owner) may list, with indicators for “already on my menu.”

**Sub-choice for canonical `cocktails` rows:**

| Variant | Model | Pros | Cons |
|--------|--------|------|------|
| **A1** | `bar_id` **NULL** = global template; non-null = legacy or bar-private drafts | One table, clear “global pool” | Migration: set template rows to `NULL`; RLS must allow platform or service role to manage globals |
| **A2** | Separate **`cocktail_templates`** + **`cocktails`** only as menu instances | Very explicit | More joins, more duplication if you still materialize per-bar rows |
| **A3** | Keep single `cocktails`; **`bar_id` = owner bar** for “created here” but **menu** still junction to any id the bar is allowed to reference | Minimal schema rename | Need rules: which `cocktail_id`s can a bar attach? (e.g. global + own only) |

**Recommendation:** **A1** or **A3** with strict rules: bars may only add junction rows to **global** cocktails plus **cocktails they created** (if you keep bar-owned originals).

### Option B — **Copy per bar**

- Each bar has its own `cocktails` rows (forked copy).
- “Include from catalog” = **insert copy** (and optionally link to `source_cocktail_id` for lineage).

**Pros:** Simple mental model per bar; RLS stays “row.bar_id = my bar.”  
**Cons:** Drift between bars; harder “one true recipe”; bulk operations are heavier; deduping and updates are painful.

### Option C — **Hybrid**

- Global templates + optional **bar overrides** (extra columns on `bar_cocktails` or child row) for name/image/price without forking the whole recipe.

---

**Historical note:** A1 is now the locked choice (see **Resolved decision 1** above).

---

## Resolved decision 2 — Default bar (**Option A**)

**Chosen:** **Keep `profiles.bar_id` as the user’s default / home bar.**

- Used for default redirects after login, OAuth flows, and any UX that needs a single “primary” bar until multi-bar UX is fully contextual.
- **Membership and access** for additional bars come from **`bar_members`** (and invites), not from `profiles.bar_id` alone.
- **RLS and reads** for menu/cart/favorites-at-bar should use **current URL / request bar context** where appropriate, not only `current_user_bar_id()` from profile.

---

## Open decision 2 — `profiles.bar_id` vs preferences (expanded, background)

`profiles.bar_id` is used today as:

- **Home bar** for redirects (`homeBarSlug`), OAuth “join” flow (when still on platform default), and RLS helpers like `current_user_bar_id()` for favorites/cart writes.
- **Implicit “primary tenant”** for users who only ever use one bar.

When users **belong to multiple bars**, a single `bar_id` is ambiguous: it is not obvious whether it means “default landing,” “only bar,” or “last visited.”

### Option A — **Keep `profiles.bar_id` as “default / home bar”**

- **Meaning:** Where OAuth and `/login` send you by default; where **global favorites** context might default; optional **primary** for notifications.
- **Multi-bar:** Actual access comes from **`bar_members`** (or invite acceptance). Visiting `/some-slug` uses **URL bar**, not necessarily `profiles.bar_id`.
- **RLS:** Stop using `current_user_bar_id()` for anything that should be **URL-scoped** (e.g. menu read, cart intent). Use **request context** (client passes `bar_id` or slug) plus **membership or public bar** rules. Writes that are truly “per user home” (legacy) shrink over time.

**Pros:** Small migration; clear name if documented as **default_bar_id**.  
**Cons:** Requires auditing every policy and query that assumed “one bar per user.”

### Option B — **Rename / move to `user_preferences`**

- e.g. `user_preferences (user_id, default_bar_id, last_visited_bar_id, theme, …)`.
- **`profiles`** stays identity-only (or platform flags only).

**Pros:** Cleaner separation; room for last-visited without overloading `profiles`.  
**Cons:** Extra table/join; migration from `profiles.bar_id`.

### Option C — **No stored default — derive**

- Last visited in **client** (`localStorage`) + always land on `/last-slug` or marketing page.

**Pros:** No wrong “home” in DB.  
**Cons:** Weaker server-side defaults for email links and support.

---

**Historical note:** Option A is locked (see **Resolved decision 2** above). Option B remains a future refactor if preferences grow.

---

## Open decision 3 — Favorites (**resolved**: both global and per-bar)

**Requirement:** Users see:

1. **Global favorites** — recipes they saved without tying to a specific venue (canonical cocktail ids from the global/template pool).
2. **A separate tab: favorites available at the bar I’m in** — intersection of global (or all user favorites) with **this bar’s menu**, or **explicit per-bar favorites** stored separately.

### Suggested schema

| Table | Purpose |
|-------|--------|
| **`favorite_cocktails_global`** | `(user_id, cocktail_id, created_at)` — `cocktail_id` references **canonical** `cocktails` (global/template rows). |
| **`favorite_cocktails_bar`** | `(user_id, bar_id, cocktail_id, created_at)` — favorite **in the context of this bar**; FK/menu check: `cocktail_id` must appear on that bar’s menu (`bar_cocktails`). |

### Profile UI

- **Tab 1 — “All favorites”** (global): list from `favorite_cocktails_global`; show which bars currently list each (optional enrichment).
- **Tab 2 — “At this bar”** (contextual):  
  - either **filter** global ∩ current bar menu, **or**  
  - list **`favorite_cocktails_bar`** where `bar_id = currentBar.id`.

**Product nuance:** If you only use **filter** for tab 2, you do not need `favorite_cocktails_bar` — but a **separate row** per bar lets the same user “heart” the same recipe in two venues with different meaning (e.g. “I always order this here”). **Recommendation:** keep **both tables** if you want that distinction; otherwise **global + filtered tab** is simpler.

### RLS

- **Insert/select** for global: `auth.uid() = user_id`.
- **Per-bar:** `auth.uid() = user_id` and user has **access** to `bar_id` (member or public policy).

---

## Open decision 4 — Invites (**resolved**: magic link for now)

**Chosen approach:** Bar owner shares a **link**. Anyone who **logs in or registers** after arriving via that link **gains access** to that bar (membership or equivalent).

### Suggested mechanics

1. **Token table** `bar_invite_links` (or `bar_access_tokens`):  
   `id`, `bar_id`, `token` (opaque, unguessable), `created_by`, `expires_at` nullable, `revoked_at` nullable, optional `label` for owner (“Summer promo”).
2. **URL shape:** e.g. `https://app.example.com/join/{token}` or `https://app.example.com/{barSlug}?invite={token}` (second leaks bar slug; first is cleaner).
3. **Client:** On hit, persist token in **`sessionStorage`** (same pattern as registration intent), then send user through **login/register**; on **Auth callback**, RPC **`accept_bar_invite(token)`**:
   - validates token,
   - inserts **`bar_members`** (`bar_id`, `user_id`, role `patron` or `guest`),
   - clears stored token.
4. **RLS:** Menu read for “invited” bars requires either **public bar** or **`bar_members`** row — define whether invite-only bars are **non-public** until invite (product choice).

### Future extensions (out of scope for v1)

- Email invites (token bound to email).
- Short **invite codes** (type in app).
- Expiring links, max uses, role embedded in token (e.g. staff vs patron).

---

## Resolved decision 5 — Roles: **`bar_members` + `superadmin`** (expanded)

Today, some users have **`profiles.role = 'admin'`** and RLS uses **`current_user_is_admin()`** + **`current_user_bar_id()`** so they only **mutate** rows for their home bar. That is **implicit** bar admin, not explicit membership.

### Target state

| Layer | Responsibility |
|--------|----------------|
| **`bar_members`** | All **bar-scoped** powers: `owner`, `admin`, `staff`, `patron`, etc. Bar UI (“Admin” for `/slug/admin`) and RLS for ingredients, menu junction, bar settings, etc. use **membership + role on that bar**. |
| **`profiles.role = 'user'`** | Default for patrons and bar operators; no global “I am admin everywhere.” |
| **`profiles.role = 'superadmin'`** | **Platform staff only** — support, moderation, managing **global** `cocktails` (`bar_id` NULL), cross-bar diagnostics, or emergency overrides. **Not** used for normal venue operators. |

**Enum migration:** Extend `user_role` (or equivalent) with **`superadmin`**: e.g. `'user' | 'superadmin'` on `profiles`. The old **`admin`** value is **deprecated** for bar operators once migration completes; existing DB rows transition as below.

**App behavior:**

- **Bar admin panel:** visible if `bar_members` has `owner` / `admin` / `staff` (exact set TBD) for **current bar**.
- **Platform console** (if any): gated on **`profiles.role = 'superadmin'`** only.
- **`current_user_is_admin()`** (legacy): replace with helpers such as **`user_can_admin_bar(target_bar_id)`** reading **`bar_members`**, plus **`current_user_is_superadmin()`** for platform-only policies.

### Migration steps (conceptual)

1. **Add enum value** `superadmin` to `user_role` (migration).
2. **Create `bar_members`** with at least:  
   `(bar_id, user_id, role, created_at)` and **`UNIQUE (bar_id, user_id)`**.  
   Use a **`bar_member_role`** enum (`owner`, `admin`, `staff`, `patron`, …) distinct from `profiles.role`.
3. **Backfill owners:**  
   For each **`bars`** row with **`owner_user_id` IS NOT NULL**, insert  
   `bar_members (bar_id, owner_user_id, role = 'owner')`.
4. **Backfill legacy bar admins:**  
   For each **`profiles`** where **`role = 'admin'`** (these are **venue** admins today, not platform):
   - Resolve **`bar_id`** from **`profiles.bar_id`**.
   - Insert **`bar_members (bar_id, user_id, role = 'admin')`** if not already present as `owner`.
   - **Edge case:** `profiles.bar_id` = platform **default** bar → insert **`bar_members`** for **default bar** with `admin` (or `owner` if they are also `owner_user_id` on that bar). Do **not** promote to `superadmin` unless manually whitelisted.
5. **Promote true platform staff (manual / one-off):**  
   For the small set of accounts that should remain platform-wide, set **`profiles.role = 'superadmin'`** explicitly (SQL or admin tool). Everyone else who was **`admin`** should end as **`user`** at the profile level after step 6.
6. **Update RLS** for bar-scoped tables to use **`bar_members`** (+ optional **`superadmin`** bypass where policy explicitly allows platform override).
7. **Set `profiles.role = 'user'`** for all migrated venue **`admin`** rows (those now represented in **`bar_members`**). **Leave `superadmin` unchanged** for platform accounts.
8. **Deploy app** that reads **`bar_members`** for per-bar admin; uses **`profiles.role === 'superadmin'`** only for platform features.

### Rollback / safety

- Run backfill in a **transaction**; verify counts (legacy `profiles.role = 'admin'` count ≈ `bar_members` rows for `admin`/`owner` as expected, plus explicit `superadmin` list).
- Feature-flag **new RLS** if doing blue/green.
- Keep a **named list** of user IDs to receive **`superadmin`** before flipping **`admin` → `user`** in bulk.

### Communication

- Venue operators: “Your admin access is unchanged for your bar; you may later get access to other bars via invite.”
- Platform team: document who holds **`superadmin`** and that it is **not** for bar owners.

---

## Risks and engineering notes

- **RLS growth:** Prefer small **`SECURITY DEFINER`** functions (`user_can_admin_bar`, `user_can_access_bar`, `cocktail_on_bar_menu`) to avoid **`profiles` recursion** and duplicated subqueries.
- **Performance:** Index **`bar_cocktails (bar_id, cocktail_id)`**, **`bar_members (user_id, bar_id)`**, favorites tables on `(user_id)` and `(user_id, bar_id)`.
- **Toggle all in admin:** Apply to **filtered result set**; confirm UX for large catalogs; consider **batch RPC** or chunked updates.

---

## Document history

- Initial plan + open decisions.
- Updated with: expanded decisions **1, 2, 5**; resolved **3** (both favorite types + two Profile tabs); resolved **4** (magic invite link, future channels noted).
- **Locked:** Decision **1 = A1** (global `cocktails` with `bar_id` NULL + `bar_cocktails` menu). Decision **2 = A** (keep `profiles.bar_id` as default home bar). Decision **5** = migrate venue **`admin`** → **`bar_members`**; introduce **`superadmin`** on `profiles` for platform staff only; deprecate profile-level **`admin`** for bars.
