import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Select } from '../components/ui/select.jsx';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card.jsx';

export default function AddUserPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    status: 'active',
    role_id: '',
  });
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch('/api/roles')
      .then(r => r.json())
      .then(setRoles)
      .catch(() => setError('Failed to load roles'));
  }, [authFetch]);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ ...form, role_id: Number(form.role_id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      navigate('/users');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Add User</h1>

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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                required
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
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create user'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/users')}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
