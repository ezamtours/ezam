# EZAM Supabase Production Setup

This folder contains a **backend-ready** EZAM website and admin CRM. The preview works in demo/local-storage mode. For real shared data, authentication, lead assignment, and multi-device use, connect a dedicated Supabase project.

## Do not use an unrelated Supabase project

The connected account currently has other projects, but none is an EZAM project. Do not mix EZAM customer leads with unrelated applications.

Create a dedicated project such as `EZAM Travel`.

## 1. Create the EZAM project

In Supabase:
1. Create a new project in the preferred organization.
2. Use a Southeast Asia region when appropriate for the business and users.
3. Wait until the project is healthy.

Creating a project can affect billing, so the project should be created only after the account owner confirms the organization/cost.

## 2. Apply the database schema

Open the Supabase SQL editor for the dedicated EZAM project and run:

`backend/ezam_schema.sql`

The schema creates:

- `profiles`
- `packages`
- `leads`
- `site_settings`
- role-aware RLS policies
- owner/admin lead visibility
- public package visibility
- public inquiry insertion
- Realtime publication for leads/packages

### Access model

**Owner**
`ezamtourstravelservices01@gmail.com`

- full lead visibility
- assign/reassign leads
- package publishing
- admin activation/deactivation
- website/social settings

**Admin**

- signs in with their own Supabase Auth account
- must have an active `profiles` row with role `admin`
- sees only leads where `assigned_to = auth.uid()`
- can update only their assigned leads
- cannot manage packages/admin accounts/site settings

**Public visitor**

- can read only published packages
- can submit a new inquiry
- cannot read the leads database
- cannot set internal status, assignment, priority, or owner notes

## 3. Create the owner account

After the schema is installed, create the owner in **Authentication → Users** using:

`ezamtourstravelservices01@gmail.com`

The database trigger recognizes that exact email and creates an active `owner` profile.

If the Auth user already existed before the schema was installed, run this in SQL after replacing `<OWNER_USER_UUID>` with the Auth user UUID:

```sql
insert into public.profiles (id,email,display_name,role,is_active)
values (
  '<OWNER_USER_UUID>',
  'ezamtourstravelservices01@gmail.com',
  'Iza',
  'owner',
  true
)
on conflict (id) do update
set email=excluded.email,
    display_name=excluded.display_name,
    role='owner',
    is_active=true,
    updated_at=now();
```

## 4. Deploy the owner-only admin invitation function

Source:

`backend/invite-admin/index.ts`

Deploy it as an Edge Function called:

`invite-admin`

Keep JWT verification enabled.

Set the server-side secret:

- `SUPABASE_SERVICE_ROLE_KEY`

The browser must never receive this key.

The function verifies that the caller is the exact EZAM owner email before sending an admin invitation.

## 5. Configure public frontend credentials

Get:

- Project URL
- publishable key (`sb_publishable_...` is preferred)

Edit:

`assets/js/config.js`

Set:

```js
window.EZAM_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "sb_publishable_...",
  ownerEmail: "ezamtourstravelservices01@gmail.com",
  demoMode: false,
  socialDefaults: {
    facebook: "",
    instagram: "",
    tiktok: ""
  }
};
```

Never put the `service_role` key in `config.js`.

## 6. Secure authentication settings

Recommended:
- Do not expose a public admin sign-up screen.
- Owner invites admins.
- Require email confirmation as appropriate.
- Configure production SMTP for reliable password recovery/invitations.
- Keep admin accounts individual; do not share one password.
- Consider MFA for owner/admin accounts if enabled for the project.

## 7. Add official social URLs

After owner login:
1. Open **Settings**.
2. Add the official Facebook/Messenger URL.
3. Add Instagram URL.
4. Add TikTok URL.
5. Save.

The public website social buttons update from `site_settings`.

### Social DMs and the CRM

The current build opens the platform links for travelers.

Automatic ingestion of Facebook/Instagram/TikTok direct messages into `leads` requires the relevant Meta/TikTok APIs, access tokens, webhooks, and platform approvals. Until those are configured, staff can use **Add lead** and choose the relevant social platform as `source`.

## 8. Verify RLS before launch

Test these accounts separately:

### Logged out
- published packages visible
- unpublished packages hidden
- inquiry can be submitted
- lead database cannot be read

### Owner
- sees all leads
- sees unassigned leads
- can assign a lead to Admin A
- can reassign to Admin B
- can publish/unpublish packages
- can manage admins/settings

### Admin A
- sees leads assigned to Admin A only
- cannot see Admin B's leads
- cannot see unassigned leads
- cannot manage package/admin/settings screens

### Admin B
Run the reciprocal test.

## 9. Run Supabase Advisors

After schema/function setup, run:
- Security Advisor
- Performance Advisor

Resolve RLS/security issues before launch.

## 10. Production switch

Only after the backend tests pass:
- set `demoMode: false`
- deploy the full site
- test on a second browser/device
- submit a real website inquiry
- confirm owner sees it
- assign it to an admin
- confirm only that admin sees it
- log out and confirm admin pages redirect to login
