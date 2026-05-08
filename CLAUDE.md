# Base Template — Project Context

## Stack
- **Monorepo** via npm workspaces: `server/` (Node/Express), `client/` (React/Vite)
- **Database**: PostgreSQL (local or Docker). Run migrations manually or via Docker Compose.
- **Auth**: JWT (jsonwebtoken) + bcrypt password hashing
- **UI**: Tailwind CSS v3 + shadcn/ui components in `client/src/components/ui/`

## Running locally
```bash
cp .env.example .env
# Start Postgres (Docker or local)
docker compose up -d
# Run migrations against local Postgres (if not using Docker)
psql -U appuser -d appdb -f db/migrations/001_schema.sql
psql -U appuser -d appdb -f db/migrations/002_rbac.sql
psql -U appuser -d appdb -f db/migrations/003_seed_dev.sql
# Start everything
npm run dev   # server :3001, client :5173
```

Dev seed user: `s@a.com` / `p` (super_admin)

## Key architectural decisions

### Database IDs
- `users` and `user_email_logins` use **integer BIGSERIAL** as primary key for fast joins.
- `users` also has a `user_guid UUID` (unique) for external-facing API references — never expose the integer id publicly.
- `user_email_logins` has **no UUID** — sessions and JWTs are tied to the user, not the login method, so there's no need to reference a login record externally.

### Auth flow
- JWT payload: `{ sub: user_guid, uid: user_id }` — only identity, no roles or permissions.
- Permissions are loaded fresh from the DB on every authenticated request (see `authenticate.js` middleware). Add Redis caching here when performance requires it.
- Email must be validated before login is allowed. In dev, the `validationToken` is returned in the register response so you can test without an email provider.

### RBAC — check permissions, never roles
Never write `if (user.role === 'admin')` in application code. Always check permissions:
```js
// Route-level protection
router.get('/users', authenticate, authorize('users:read'), handler);

// In-handler ownership check (no RBAC needed for self-service actions)
if (req.params.userId !== String(req.user.id)) return res.status(403).json(...);
```

**Super admin**: the `roles.is_super` flag bypasses all permission checks. Super admins automatically pass every `authorize()` call — do not add explicit permissions for them.

**Ownership vs permissions**:
- "Can this role type do X?" → RBAC (`permissions` table)
- "Can this user do X to their own record?" → ownership check in code, not RBAC
- Example: `profile:update` is not a permission. Any authenticated user can update their own profile via an ownership check. `users:update` (update anyone's profile) is a permission.

**Permission naming convention**:
```
resource:action         users:read, invoices:write
resource:action:any     users:read:any (breaks ownership scope — admin/manager level)
resource:action:special invoices:approve (non-CRUD actions)
```

### Email uniqueness constraint
A **partial unique index** (not a boolean column) enforces one validated email per address:
```sql
CREATE UNIQUE INDEX ... ON user_email_logins(email) WHERE email_validated_at IS NOT NULL;
```
This allows the same email to exist multiple times while unvalidated (re-registration before verifying) but prevents two validated records with the same email. Do not add an `emailIsValid` boolean — it's derived data that can drift.

### User status
Users have a `status` field (`active`, `inactive`, `deleted`) checked in the `authenticate` middleware before permission checks. Do not use "no role assigned" as a suspension mechanism — it's implicit and bypassable. Status is the explicit gate.

### dotenv in monorepo
npm workspaces run server scripts from `server/` as the cwd, so `dotenv` cannot find the root `.env` automatically. `server/src/env.js` loads dotenv with an explicit absolute path. **This file must be the first import in `server/src/index.js`** — ESM evaluates imports depth-first, so env.js loads before pool.js reads `process.env`.

### Express 4 async error handling
Express 4 does not catch errors thrown in async route handlers. Every async handler needs `try/catch` with `next(err)` to reach the global error handler. Without it, an unhandled rejection crashes the server process (nodemon restarts it, but the request gets no response).

### Future: org/subdivision scoping
When org-level roles are needed, add `scope_type` and `scope_id` columns to `user_roles`:
```sql
ALTER TABLE user_roles ADD COLUMN scope_type VARCHAR(50);  -- 'global', 'org', 'division'
ALTER TABLE user_roles ADD COLUMN scope_id BIGINT;         -- id of the scoped entity
```
Application code already checks permissions correctly — the scope would be passed into the `authorize()` middleware as an additional parameter. No other changes needed.

## Adding new UI pages
Use the components in `client/src/components/ui/`. Page layout pattern:
```jsx
import { Button } from '../components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card.jsx';

export default function MyPage() {
  return (
    <div className="min-h-screen bg-muted/40 p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <Card>
          <CardHeader><CardTitle>Title</CardTitle></CardHeader>
          <CardContent>...</CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## Adding new API routes
```js
// Public route
router.post('/something', async (req, res, next) => {
  try { ... } catch (err) { next(err); }
});

// Protected — login required
router.get('/something', authenticate, async (req, res, next) => {
  try { ... } catch (err) { next(err); }
});

// Protected — specific permission required
router.get('/something', authenticate, authorize('resource:action'), async (req, res, next) => {
  try { ... } catch (err) { next(err); }
});
```

## Migrations
Files in `db/migrations/` are numbered and run in order. Never edit an existing migration once it has been run — add a new numbered file instead. `003_seed_dev.sql` is dev-only and should not run in production.
