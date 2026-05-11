import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell,
} from '../components/ui/table.jsx';

const STATUS_STYLES = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  deleted:  'bg-red-100 text-red-600',
};

export default function ManageUsersPage() {
  const { authFetch } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(() => setError('Failed to load users'));
  }, [authFetch]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Manage Users</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Roles</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow
              key={user.user_guid}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/users/manage/user?guid=${user.user_guid}`)}
            >
              <TableCell>{user.email ?? '—'}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLES[user.status] ?? ''}`}>
                  {user.status}
                </span>
              </TableCell>
              <TableCell>{user.roles?.join(', ') ?? '—'}</TableCell>
            </TableRow>
          ))}
          {users.length === 0 && !error && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
