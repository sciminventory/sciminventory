# Priority Operations Platform

A multi-tenant operations platform for inventory, procurement, logistics, and recruitment, with an explainable scikit-learn applicant-ranking service.

## Included

- Premium responsive marketing landing page with interactive product and lifecycle previews.
- Authentication screens and Supabase PKCE callback.
- Protected, responsive operations shell and control tower.
- Organization membership, roles, warehouse assignment, audit, RLS, and private Storage foundation.
- Owner administration for organization settings, invitations, roles, membership status, warehouses, assignments, and audit history.
- Live operational modules for products, balances, immutable stock movements, transfers, cycle counts, warehouse tasks and locations, suppliers, procurement records, shipments, and private documents.
- Recruitment modules for job openings, consented applicant profiles, private résumé storage, a stage-based hiring pipeline, and auditable screening runs.
- Public careers pages for browsing open positions and submitting protected, rate-limited applications with a confirmation reference.
- Identity-blind applicant ranking using TF-IDF similarity plus explicit skill, experience, and education signals. Ranking supports human review and never makes the hiring decision.
- Tenant-scoped server mutations, role-based RLS, automatic operational audit events, and negative-stock protection.
- Mandatory TOTP multi-factor authentication for every non-viewer role, with authenticator enrollment, sign-in challenges, AAL2 database enforcement, and factor management.
- Strict TypeScript, reusable primitives, and domain-oriented project structure.

The control-tower charts and recruitment workspaces read live tenant data and refresh from database change events.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable/anon key. Add the server-only service-role key to enable owner invitations.
3. Apply every SQL file in `supabase/migrations` in filename order. Recruitment, RBAC, and MFA require migrations `005` through `011` after the existing operations migrations.
4. Add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/invite` to the allowed redirect URLs in Supabase Auth.
5. Create the screening environment and install its dependencies:

   ```bash
   cd services/screening
   python -m venv .venv
   .venv/Scripts/python -m pip install -r requirements.txt
   ```

6. Start the screening service with `.venv/Scripts/python -m uvicorn app.main:app --port 8000`.
7. From the repository root, start the web application with `npm run dev`.

Without backend environment variables, the marketing site and `/dashboard` remain available in safe preview mode.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
services/screening/.venv/Scripts/python.exe -m pytest services/screening/tests
```

See `docs/product-architecture.md` for information architecture, lifecycle rules, domain boundaries, security strategy, and the implementation roadmap.
