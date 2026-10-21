# Access, Invites & Referrals

> **Status:** Partial · **Type:** Reference · **Verified:** 2026-10-21
> **Built:** beta applications (`supabase/migrations/beta_applications.sql`, `src/routes/v1/beta/apply/`), invite codes (`supabase/migrations/20260720_invite_codes.sql`, `src/routes/v1/invite/`, `src/routes/v1/admin/invite/`, `src/lib/invite/redeem.server.ts`) · **Pending:** referral loop (no `referrals` / `referral_rewards` tables, no `/v1/referral`, no reward engine), `BETA_ONLY_MODE` (not in `src/`)

How people get into Mediqom: (A) the public beta application form, (B) invite codes, which shipped and are now the main entry path, and (C) the referral/reward loop, which is still only a design.

## A. Beta applications (as built)

### Overview

The beta access system allows potential users to apply for early access to Mediqom through a public form. Applications are stored in Supabase and can be managed through the Supabase Dashboard.

### Components

#### 1. Database Schema

**Table**: `beta_applications`

Key fields:

- `id` - UUID primary key
- `status` - pending, approved, rejected, converted
- `user_type` - family, provider, developer, organization
- `email` - unique email address
- `created_at`, `updated_at` - timestamps
- `profile_id` - links to user profile when account is created

Migrations: `supabase/migrations/beta_applications.sql` (table), `supabase/migrations/beta_approval_simple.sql` (`handle_beta_approval` / `handle_beta_user_confirmed` triggers), `supabase/migrations/20260807_beta_applications_admin_rls.sql` (admin-only RLS).

RLS policies:

- Anyone can insert (public form submission)
- Only admins (`profiles.is_admin`, checked by the `is_admin_user()` SECURITY DEFINER helper) can view/update. The original policies let any authenticated user read and approve applications; `20260807_beta_applications_admin_rls.sql` closed that
- No DELETE policy; removal is service-role only

#### 2. API Endpoint

**Endpoint**: `/v1/beta/apply`

- **POST**: Submit new beta application

  - Validates all required fields using Zod schema
  - Checks for existing applications with same email
  - Returns success/error response

- **GET**: Check application status by email (optional)
  - Query parameter: `?email=user@example.com`
  - Returns status and creation date

#### 3. Beta Form Component

**Component**: `src/components/www/BetaForm.svelte`

Features:

- Complete form matching the beta page design
- Client-side validation
- Loading states during submission
- Success/error message display
- Automatic form reset on success
- Responsive design

#### 4. Integration

The form is rendered by `src/routes/www/[lang]/[slug]/+page.svelte` when the slug is "beta" (`/www/[lang]/beta`).

### Admin Workflow

1. **View Applications**

   - Log into Supabase Dashboard (or any client as a user with `profiles.is_admin = true`)
   - Navigate to Table Editor > beta_applications
   - View all applications with filtering/sorting

2. **Review Applications**

   - Check application details
   - Add admin notes if needed
   - Update status field

3. **Approve/Reject**

   - Change status to "approved" or "rejected"
   - Add notes about the decision
   - Save changes

4. **Automated User Creation** (When status → "approved")

   - Database trigger automatically:
     - Creates auth user with their email
     - Creates profile entry linked to auth user
     - Supabase automatically sends confirmation email with magic link
     - Links beta application to profile

5. **User Confirms Email**
   - User receives Supabase's standard confirmation email
   - Clicks magic link to confirm account
   - Sets password on first login
   - Database trigger marks beta application as "converted"
   - User can now sign in normally

### Future Enhancements

1. **Custom Email Templates**

   - Customize Supabase auth email templates
   - Add beta-specific welcome content
   - Branded email design

2. **Enhanced Automation**

   - Auto-approve based on criteria
   - Bulk approval interface
   - Waitlist management

3. **Analytics Dashboard**
   - Application trends
   - Conversion rates
   - User type distribution
   - Geographic distribution

### Security Considerations

- Email uniqueness enforced at database level
- RLS policies prevent public access to application data
- All inputs validated server-side
- Rate limiting built into auth system
- Sign-in uses OTP with `shouldCreateUser: false` (`src/routes/auth/+page.server.ts`, `src/lib/capacitor/auth.ts`), so new accounts are created only by beta approval or an invite (section B)
- **Not built:** the auth hook and the environment-controlled `BETA_ONLY_MODE` flag described in earlier versions of this doc. `BETA_ONLY_MODE` appears nowhere in `src/` or `supabase/`

### Testing

#### Beta Application Flow:

1. Visit `/www/en/beta`
2. Fill out the form with test data
3. Submit and verify success message
4. Check Supabase Dashboard for new application

#### Beta Approval Flow:

1. In Supabase Dashboard, change status to "approved"
2. Verify auth user and profile are created
3. Check that Supabase sends confirmation email

#### Auth Protection:

`BETA_ONLY_MODE` does not exist, so there is no toggle to test. To check the gate, try signing in with an email that has no account: the OTP request must not create one.

### Maintenance

- Monitor for spam applications
- Regular review of pending applications
- Archive old/rejected applications periodically
- Update form fields as requirements change

## B. Invite codes (shipped)

Invite-only access shipped on 2026-07-20 and was undocumented until now. Each user can mint a small number of single-use codes; redeeming one sends a Supabase account invite. This is the only self-service path that creates an account.

### Schema — `supabase/migrations/20260720_invite_codes.sql`

- `profiles.is_admin boolean` (default false) and `profiles.invite_quota_bonus integer` (default 0).
- `invite_codes`: `code` (PK), `created_by` (null for admin-minted codes), `status` (`available` | `claimed`), `claimed_by`, `claimed_email`, `claimed_at`, `created_at`. RLS: users can SELECT their own codes; all writes go through the service role.
- `waitlist_signups`: `email` (unique). Anyone can INSERT. Written by `POST /v1/waitlist/join` for visitors without a code.
- `claim_invite_code(p_code, p_email)`: SECURITY DEFINER, row-locks the code and returns `{success}` or `{success:false, reason:'not_found'|'already_claimed'}`. `20260720_invite_codes_revoke_public_execute.sql` revokes EXECUTE from `anon` / `authenticated`, so only the service-role endpoints can call it.

### Endpoints

| Endpoint                      | Auth   | Behaviour                                                                                                                                                                |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /v1/invite/generate`    | user   | Mints one 8-char code if `count(created_by = me) < MAX_INVITES_PER_USER + invite_quota_bonus`. Returns `{ code, link: /auth?invite=CODE }`. Rate-limited 10/min, audited |
| `GET /v1/invite/mine`         | user   | The user's codes (status, claimed email, dates) plus `{ used, limit }`                                                                                                   |
| `POST /v1/invite/redeem`      | public | `{ code, email }` → claim + invite email. Rate-limited 5/min per email, audited as anonymous                                                                             |
| `POST /v1/admin/invite/send`  | admin  | Mints a code outside any quota (`created_by = null`) and redeems it for the given email                                                                                  |
| `POST /v1/admin/invite/quota` | admin  | Sets `invite_quota_bonus` for the account found via `find_profile_by_email`                                                                                              |

Admin checks use `isAdminUser()` in `src/lib/auth/admin.server.ts` (`profiles.is_admin`). The quota base comes from the `MAX_INVITES_PER_USER` env var (default 4, `src/lib/config/invite-config.ts`).

### Redemption — `src/lib/invite/redeem.server.ts`

`redeemInviteCode()` is shared by the public redeem and admin send endpoints:

1. Calls `claim_invite_code` (409 if already claimed, 404 if unknown).
2. Calls `auth.admin.inviteUserByEmail(email, { redirectTo: /auth/callback?next=/med })`.
3. If the invite email fails (including "already registered"), it releases the code back to `available` so a scarce invite is not burned.
4. On success it records `claimed_by` = the new auth user id.

### UI

- `src/routes/auth/+page.svelte`: reads `?invite=CODE`, shows the code + email redeem form and the waitlist fallback.
- `src/routes/med/settings/invites/+page.svelte`: the user's codes and remaining quota; admins also get the "send invite" and "grant quota" forms.

## C. Referral loop (design, pending)

> **Design only (pending).** Folded in from the former `docs/REFERRAL_LOOP_DESIGN.md`. None of it is built: there is no `referrals`, `referral_codes`, `referral_rewards` or `founding_members` table, no `/v1/referral/*` route and no reward engine. The shipped invite codes (section B) already cover per-user codes, quotas and email invites, so a future build should extend `invite_codes` rather than add a parallel `referral_codes` table.

### Goal

Turn beta access into a viral loop: invited users unlock product benefits by
inviting others ("earn features instead of paying"), and early adopters get a
"Founding Member" identity. Growth compounds: each accepted invite grants the new
user their own invite quota.

### What exists today (reuse, don't rebuild)

- **Waitlist**: `beta_applications` table + `handle_beta_approval` trigger
  (`supabase/migrations/beta_approval_simple.sql`) — public form → admin approves
  in Supabase Dashboard → auth user + profile created + magic link emailed.
- **Email invite plumbing**: `supabase.auth.admin.inviteUserByEmail()` is already
  used for document sharing (`src/routes/v1/share/create/+server.ts`) with a
  `redirectTo` → `/share/accept`. The same call powers referral invites.
- **Reward primitives** (`supabase/migrations/20260217_subscription_billing.sql`):
  - `add_scan_credits(p_user_id UUID, p_credits INTEGER, p_idempotency_key TEXT)`
    — idempotent (dedupes on `purchase_history.idempotency_key`); grants scans.
  - `update_subscription_tier(...)` — bump tier (`free|caretaker|family`).
  - `check_profile_limit(p_user_id)` / `subscription_tiers.profile_limit` — the
    cap a "invite N → unlock more profiles" mechanic targets.
- **Tiers**: `SubscriptionTierId = "free" | "caretaker" | "family"`
  (`src/lib/billing/types.ts`), seeded in the billing migration.

### What must be built

#### 1. Schema (new migration `supabase/migrations/<date>_referrals.sql`)

```sql
-- One invite code per user (the sharer's stable link)
create table referral_codes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  code        text unique not null,          -- short, URL-safe
  created_at  timestamptz not null default now()
);

-- One row per invite/redemption edge
create table referrals (
  id            uuid primary key default gen_random_uuid(),
  inviter_id    uuid not null references auth.users(id) on delete cascade,
  code          text not null references referral_codes(code),
  invitee_email text,                          -- set when invite sent by email
  invitee_id    uuid references auth.users(id) on delete set null, -- set on signup
  status        text not null default 'pending'  -- pending | accepted
                check (status in ('pending','accepted')),
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz
);
create index on referrals (inviter_id);
create unique index on referrals (invitee_id) where invitee_id is not null;

-- Reward ledger — every milestone payout, idempotent
create table referral_rewards (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  milestone       int not null,                -- e.g. 1,4,10 accepted invites
  reward_type     text not null,               -- 'scan_credits' | 'tier_bump' | 'founding'
  idempotency_key text unique not null,        -- e.g. `${user_id}:milestone:${milestone}`
  granted_at      timestamptz not null default now()
);

-- Founding Members — sequential number under a cohort cap
create table founding_members (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  member_number int unique not null,           -- assigned by a sequence + cap check
  granted_at    timestamptz not null default now()
);
```

RLS: users `select` their own `referral_codes` / `referrals` / `referral_rewards`
/ `founding_members`; only `service_role` writes. No `update`/`delete` for users
(same posture as `audit_logs`). Add `SET search_path = public` to any new function
(project lint rule).

#### 2. Attribution flow

1. **Generate**: on first visit to the referral UI, upsert a `referral_codes` row
   for the user (short code). Share URL: `/invite/<code>`.
2. **Send**: emailing an invite inserts a `referrals` row (`status='pending'`,
   `invitee_email` set) and calls `inviteUserByEmail(email, { redirectTo:
'/auth/callback?next=/invite/<code>' })` — reuse the `?next=` handling already
   in `/auth/callback`.
3. **Redeem**: `/invite/<code>` stores the code (cookie/localStorage) through
   signup; on first authenticated load, a `POST /v1/referral/accept` sets the
   matching `referrals` row to `accepted` with `invitee_id` + `accepted_at`
   (guard: a user can accept at most one code; can't self-refer).

#### 3. Reward engine (`service_role`, idempotent)

On each accepted referral, count the inviter's `accepted` referrals and pay out
any newly-crossed milestone that has no `referral_rewards` row yet:

- Milestone → `add_scan_credits(inviter_id, credits, `${inviter}:m:${n}`)` and/or
  `update_subscription_tier(...)`. The `idempotency_key` guarantees exactly-once
  even if the endpoint is retried.
- First N accounts overall (cohort cap) also get a `founding_members` row
  (sequential `member_number`) + a `founding` reward. Badge surfaced in-app.

Suggested first ladder (tune later): 1 invite → +X scans; 4 invites → longer AI
history / extra AI models flag; 10 invites → tier bump. The "unlock feature X"
milestones map to **feature flags** the same way `PUBLIC_ENABLE_*` do, but read
per-user from `referral_rewards` rather than build-time env.

#### 4. Beta-entry gate

The `BETA_ONLY_MODE` env flag + auth hook described in older docs was never
implemented (`grep BETA_ONLY_MODE` → nothing). Since 2026-07-20 the gate exists in
a different form: OTP sign-in runs with `shouldCreateUser: false`, so accounts are
created only through beta approval or invite redemption (section B). A dedicated
auth hook is only needed if signups are opened through another path.

### Landmine to resolve FIRST

`beta_approval_simple.sql` sets `profiles.subscription` using a **legacy** enum
(`'pro' | 'family' | 'individual'`) that is inconsistent with the current
`subscription_tiers` model (`free | caretaker | family`). Reconcile these before
layering referral-driven tier changes — otherwise `update_subscription_tier`
payouts and the legacy trigger will fight over the same column with different
vocabularies. Pick one source of truth (the `subscriptions` table + tier ids) and
migrate the trigger off the legacy enum.

### Rough build order

1. Reconcile the legacy subscription enum (landmine above).
2. Schema migration + RLS.
3. `/v1/referral/*` endpoints (code upsert, send-invite, accept) + attribution.
4. Reward engine (milestone payout on accept, idempotent) + Founding Member cap.
5. Beta-entry gate: largely covered by invite codes (see §4 above).
6. UI: invite link + progress-to-unlock + Founding Member badge.
