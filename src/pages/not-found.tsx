import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex h-full min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>404 · Page not found</CardTitle>
          <CardDescription>
            We can’t find the page you were looking for. Check the route or return to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This route either does not exist or was removed. The app has redirected you back to the safe zone.
          </p>
          <Button asChild className="w-full">
            <Link to="/">Return to Projects</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
