import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from './ui/button.jsx';
import { cn } from '../lib/utils.js';

// permission: null  = visible to all authenticated users
// actions: []       = buttons rendered in the top bar only when this route is active
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    permission: null,
    actions: [],
  },
  {
    label: 'Users',
    path: '/users',
    icon: Users,
    permission: 'users:',
    actions: [
      { label: 'Add User', path: '/users/adduser', permission: 'users:write' },
    ],
  },
];

export default function AppLayout({ children }) {
  const { user, hasPermission, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    item => item.permission === null || hasPermission(item.permission)
  );

  // Top bar actions: shown for the active section and all its sub-routes
  const activeItem = NAV_ITEMS.find(item => location.pathname.startsWith(item.path + '/') || location.pathname === item.path);
  const visibleActions = (activeItem?.actions || []).filter(
    action => !action.permission || hasPermission(action.permission)
  );

  return (
    <div className="min-h-screen bg-muted/40">

      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center px-4">
        {/* Left — brand */}
        <div className="flex items-center gap-3 flex-1">
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold text-lg">Brand Here</span>
        </div>
        {/* Center — contextual sub-navigation */}
        <nav className="flex items-center gap-1">
          {visibleActions.map(action => (
            <NavLink
              key={action.path}
              to={action.path}
              className={({ isActive }) => cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                isActive
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {action.label}
            </NavLink>
          ))}
        </nav>
        {/* Right — reserved for future use (notifications, avatar, etc.) */}
        <div className="flex-1" />
      </header>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-16 left-0 bottom-0 w-60 bg-white border-r z-40 flex flex-col transition-transform duration-200 ease-in-out',
        'md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Nav items */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {visibleItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out pinned to bottom */}
        <div className="p-3 border-t flex flex-col gap-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-60 mt-16 p-6">
        {children}
      </main>

    </div>
  );
}
