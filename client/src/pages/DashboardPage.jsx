import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Build your app here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Your content goes here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
