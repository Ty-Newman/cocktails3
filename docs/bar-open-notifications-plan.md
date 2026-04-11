# Bar open notifications — plan

Strategy notes for notifying patrons when a bar is marked open (e.g. by a “star” staff member).

---

## Goal

When an authorized member toggles **bar is open**, notify eligible members through one or more channels (**browser push** and/or **email**), respecting preferences and technical limits of each channel.

---

## v1 channel options: Web Push vs email

v1 can lead with **browser push**, **email**, or **both**. Neither is “free work”—they trade different complexity.

| | **Browser push (Web Push)** | **Email (transactional API)** |
|---|-----------------------------|-------------------------------|
| **Third-party “email ISP”?** | No ESP for delivery. You still run **your backend** (e.g. Supabase Edge Function) that sends pushes via the **Web Push protocol** (often **VAPID** keys + a small library such as `web-push`). | Yes—use a **provider** (Resend, Brevo, SendGrid, SES, …) for reliable delivery, bounces, and domain auth (**SPF/DKIM**). |
| **Easier overall?** | **Not clearly easier.** You avoid DNS/domain email setup, but you add **service worker**, **permission UX**, **subscription storage**, **subscription expiry/rotation**, and **per-browser quirks**. | More moving parts for **domain + provider**, but the **send path** is a single HTTPS API per message (or batch). |
| **Discord / OAuth users** | **Can work** for anyone using the **web app** who grants notification permission—**no mailbox required.** | Often **weak** for Discord-only accounts if `auth.users.email` is missing or unused. |
| **Reach when user is away** | Device gets the notification if the browser/OS allows background delivery; user need not have the tab open (depends on browser/OS). | Inbox works independent of your site. |
| **Permission model** | Browser **`Notification` permission** is always **user opt-in** at the OS/browser—you **cannot** silently subscribe. Your app-level **opt-out** applies only **after** they subscribe (or you never send until they enable). | Your product **opt-out** (default on) applies once you have an address; no OS prompt for *receiving* mail (but deliverability still matters). |

### Web Push — practical limitations

- **Safari / iOS:** Web Push for web apps has improved (e.g. **installed PWA** requirements on iOS historically); verify current Apple rules and test on real devices.
- **Subscriptions expire or become invalid:** store `endpoint` + keys in DB; handle **410 Gone** / failed sends and let the client re-subscribe.
- **HTTPS + service worker** required in supported browsers.
- **Payload size** is small (think short title/body + link); not a full email.
- **No built-in “unsubscribe” link** like email—users revoke in browser settings or your in-app toggle stops sending to that stored subscription.

### Recommendation for v1

- **Lead with Web Push** if most members use your **web app** on desktop/Android and you want to **avoid ESP setup** initially—still budget time for SW + subscriptions + send path.
- **Add email** (or lead with it) if you want **maximum reach** regardless of tab/install, or a **paper trail** in the inbox; pair with a provider from [Email provider options](#email-provider-options) below.
- **Both** is reasonable: push for engaged web users, email for others (and profile toggles per channel).

---

## Current scope (v1)

- **Browser push (optional / primary TBD):** users who **subscribed** (browser permission) and have not turned off bar-open push in profile; server sends via Web Push + VAPID.
- **Email (optional / primary TBD):** users with a **sendable email** and the email preference on; sent via a transactional provider (not Supabase Auth mail).
- **Discord OAuth:** **no special email handling in v1**; **Web Push can partially cover** Discord users on the web if they enable notifications. **Discord bot DMs** remain future (see below).

---

## Future scope

- **Per-bar notification preferences:** users choose which bars may notify them (see [Future: per-bar toggles](#future-per-bar-toggles)).
- **Discord bot:** DM linked users when a bar opens; respects global / per-bar prefs when implemented.
- **In-app notification center** (optional): complements push/email for history inside the app.

---

## Definitions

- **“Invited” / audience:** In this codebase, invites create **`bar_members`** rows; there is no separate invitee email list. “Notify invited users” maps to **membership in that bar** plus preference rules below, not to `bar_invite_links` alone.
- **Star member:** TBD in product terms—likely a **`bar_members` role** (e.g. `staff` or `admin`) allowed to flip `is_open`. Enforce in RLS + RPC, not only in the UI.

---

## Recipient policy (v1): opt-out + profile settings

**Default (product):** eligible members **receive** bar-open notifications **unless** they turn a channel off in settings.

1. **Global toggles (v1):** Separate booleans recommended, e.g. **`notify_bar_open_email`** (default **`true`**) and **`notify_bar_open_push`** (default **`true`** for “we may send if subscribed,” or **`false`** until first subscribe—product choice). **Off** = do not send on that channel.
2. **UI:** **Profile → Settings → Notifications** with clear labels, e.g. “Email when a bar I’m a member of opens” and “Browser notifications when a bar I’m a member of opens.”
3. **Push caveat:** toggles **on** does nothing until the user also grants **browser notification permission** and you persist a **push subscription** row.
4. **Recipients for a given open event:** **`bar_members`** of that bar (per role rules) **and** channel preference **on** **and** (for email) sendable address / (for push) at least one valid stored subscription.

**Compliance / expectations:** keep copy operational (“your venue is open”); link to settings. Email footers should link to the same toggles.

---

## Future: per-bar toggles

Later, replace or extend global flags with **per-bar preferences**, e.g. on `bar_members` or `user_bar_notification_prefs (user_id, bar_id, …)`.

- **Default for new rows** can remain “on” (opt-out per bar) or inherit global—product choice when you implement.
- Profile UI becomes a list (bars you’re a member of) with toggles per bar, plus optional “mute all.”

---

## Email provider options

You **do** need a **transactional email provider** (or SES-like infrastructure) for product email—not Gmail SMTP, and not Supabase Auth’s built-in templates.

**What to look for:** HTTP API, webhooks (bounces/complaints), domain verification (SPF/DKIM), reasonable free tier for early volume.

| Provider | Notes | Pricing (verify live pages) |
|----------|--------|------------------------------|
| [Resend](https://resend.com/) | Simple API, common with serverless; good DX | [Pricing / quotas](https://resend.com/pricing), [account quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits) |
| [Brevo](https://www.brevo.com/) | Often strong free tier for low volume | [Pricing](https://www.brevo.com/pricing/) |
| [SendGrid](https://sendgrid.com/) | Mature; free tier has changed over time | [Pricing](https://sendgrid.com/en-us/pricing) |
| [Amazon SES](https://aws.amazon.com/ses/) | Very cheap at scale; more AWS/IAM setup | [SES pricing](https://aws.amazon.com/ses/pricing/) |

**Implementation:** Edge Function or backend with **secret API key**; never expose keys in the client. Link official pricing docs in runbooks—**limits change**.

---

## Email / identity realities (reference)

- **Discord OAuth:** email may be missing or low-signal; push or future Discord bot fills the gap for those users on web or Discord.

---

## Technical sketch (v1)

1. **Data:** `bars.is_open` (boolean) and optionally `opened_at` / `closed_at` for debouncing and history.
2. **Profiles (or settings):** `notify_bar_open_email`, `notify_bar_open_push` (defaults TBD), RLS for self-service updates.
3. **Push subscriptions table:** `user_id`, `endpoint`, `p256dh`, `auth`, `user_agent` / `created_at`; users can have multiple devices.
4. **Bar open toggle:** RPC or guarded update—authorized roles only; optional **closed → open** edge only.
5. **Send path** (after debounce + idempotency):
   - Resolve eligible **`bar_members`**.
   - **Email branch:** filter by email toggle + email present → provider API (batched).
   - **Push branch:** filter by push toggle → load valid subscriptions → Web Push (VAPID) per subscription; drop dead endpoints on failure.

---

## Abuse and UX guards

- **Debounce:** e.g. one blast per bar per X hours; ignore rapid open/close.
- **Idempotency:** one logical “open event” id so toggles don’t duplicate sends.
- **Email:** footer link to notification settings.
- **Push:** in-app toggle + respect revoked browser permission (failed sends).

---

## Discord bot (future) — high level

- **Linking:** Discord user id on profile or via `auth.identities`.
- **Bot:** DM when bar opens for opted-in, non-muted members.
- **Defaults:** align with global / per-bar opt-out when those exist.

---

## Open decisions checklist

- [ ] v1 **primary channel:** push first, email first, or both.
- [ ] **`bar_members` roles** that receive notifications.
- [ ] Schema for **`notify_bar_open_*`** and **push_subscriptions**.
- [ ] Email: **verified email only** or any `auth.users.email`.
- [ ] Email provider + domain (SPF/DKIM).
- [ ] Push: **VAPID** key storage (secrets); service worker scope.
- [ ] Copy and deep links (`/{slug}`, profile settings).

---

## Implemented: Resend + Edge Function (repo)

Email bar-open notifications are wired as follows:

1. **Database** (`supabase/migrations/20250416100000_bar_open_email_notifications.sql`): `bars.is_open`, `profiles.notify_bar_open_email` (default `true`), RPC `set_bar_open`, RPC `get_bar_open_email_recipients` ( **`service_role` only** ).
2. **Edge Function** `supabase/functions/notify-bar-open`: validates the user JWT, calls `set_bar_open`, then uses **`RESEND_API_KEY`** to POST `https://api.resend.com/emails` for each patron with an email (no `resend` npm package in Deno—plain `fetch`).
3. **Admin UI:** `BarOpenToggle` at the top of the bar admin panel toggles open/closed and invokes the function.
4. **Profile:** “Notifications” switch updates `notify_bar_open_email`.

### Deploy and secrets

- **Never expose** `RESEND_API_KEY` to the browser. It belongs in **Supabase Edge Function secrets**, not `VITE_*` vars.

```bash
# Production / hosted Supabase
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
# Optional: verified domain “from” (defaults to onboarding@resend.dev)
supabase secrets set RESEND_FROM_EMAIL="Bar Name <notifications@yourdomain.com>"
# Public URL for “Open the menu” links in the email body
supabase secrets set PUBLIC_APP_URL=https://your-production-host.example

supabase functions deploy notify-bar-open
```

- **Local testing** with `supabase functions serve` can load `.env` (e.g. `RESEND_API_KEY`); that file is for your machine only.

### Resend account

- Quick tests can use **`onboarding@resend.dev`** as `RESEND_FROM_EMAIL` (or leave unset to use the function default).
- For production, **verify a domain** in Resend and set `RESEND_FROM_EMAIL` to an address on that domain.

---

## Document history

- Initial plan: email v1, Discord deferred; future Discord bot.
- Updated: **opt-out** + profile settings; **future per-bar** toggles.
- Updated: **Web Push vs email** comparison; **email provider** subsection; v1 reframed as **push and/or email**; push limitations and Discord-web overlap noted.
- Updated: **Resend + `notify-bar-open` Edge Function** implementation notes and deploy commands.
