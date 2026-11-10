# EZAM Security Notes

## Production access control

The deployment is designed for **Supabase Auth + Postgres RLS**.

Do not consider a hidden URL, JavaScript role check, or localStorage role to be security. Those are used only for interface preview.

## Owner

The protected owner identity is:

`ezamtourstravelservices01@gmail.com`

Database policies grant the owner all-lead visibility and administrative operations.

## Admins

Every admin must have:
- a separate Auth user
- a `profiles` record with `role = 'admin'`
- `is_active = true`

RLS returns only leads assigned to that admin.

## Secrets

Allowed in public frontend:
- Supabase project URL
- Supabase publishable key

Never expose:
- `service_role`
- database password
- SMTP credentials
- Meta/TikTok API secrets
- webhook signing secrets

## Public inquiry submissions

Anonymous visitors can insert only public inquiry fields. They cannot submit:
- `assigned_to`
- internal status/stage overrides
- lead priority
- owner notes

## Owner notes

`owner_notes` are protected by lead RLS and are never rendered on the public site.

## Social integrations

Direct social links are safe to expose publicly.

Automated DM ingestion must be implemented server-side using verified webhooks and platform credentials. Do not put platform secrets in browser JavaScript.

## Before launch

- disable demo mode
- verify RLS using separate real users
- configure password recovery SMTP
- consider MFA for staff
- run Supabase Security Advisor
- keep dependency versions pinned
