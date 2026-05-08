import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx';

export default function DashboardPage() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/40 p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Button variant="outline" onClick={logout}>Sign out</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>You are signed in.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Build your app here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
