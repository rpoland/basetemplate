import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select } from '../components/ui/select.jsx';
import { Card, CardContent, CardFooter } from '../components/ui/card.jsx';

export default function EditUserPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const guid = searchParams.get('guid');

  const [form, setForm] = useState({
    email: '',
    password: '',
    status: '',
    role_id: '',
    scope_ids: [],
  });
  const [roles, setRoles] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!guid) { navigate('/users/manage'); return; }

    Promise.all([
      authFetch(`/api/users/${guid}`).then(r => r.json()),
      authFetch('/api/roles').then(r => r.json()),
      authFetch('/api/scopes').then(r => r.json()),
    ])
      .then(([user, roleList, scopeList]) => {
        setRoles(roleList);
        setScopes(scopeList);
        setForm({
          email: user.email ?? '',
          password: '',
          status: user.status ?? 'active',
          role_id: user.role_id ? String(user.role_id) : '',
          scope_ids: user.scope_ids ?? [],
        });
      })
      .catch(() => setError('Failed to load user'))
      .finally(() => setFetching(false));
  }, [guid, authFetch, navigate]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleScopeToggle = (scopeId) => {
    setForm(f => ({
      ...f,
      scope_ids: f.scope_ids.includes(scopeId)
        ? f.scope_ids.filter(id => id !== scopeId)
        : [...f.scope_ids, scopeId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = {
        email: form.email,
        status: form.status,
        role_id: Number(form.role_id),
        scope_ids: form.scope_ids.map(Number),
      };
      if (form.password) body.password = form.password;

      const res = await authFetch(`/api/users/${guid}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      navigate('/users/manage');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Edit User</h1>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4 pt-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="off"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">New password <span className="text-muted-foreground">(leave blank to keep current)</span></Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" value={form.status} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deleted">Deleted</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role_id">Role</Label>
              <Select id="role_id" name="role_id" value={form.role_id} onChange={handleChange} required>
                <option value="" disabled>Select a role…</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </Select>
            </div>

            {scopes.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label>Scopes</Label>
                <div className="flex flex-col gap-2 rounded-md border p-3">
                  {scopes.map(scope => (
                    <label key={scope.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.scope_ids.includes(scope.id)}
                        onChange={() => handleScopeToggle(scope.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-primary"
                      />
                      <span className="text-sm">{scope.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/users/manage')}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
