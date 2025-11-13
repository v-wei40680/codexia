import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export function RouteErrorFallback() {
  const error = useRouteError();

  let title = "Unexpected error";
  let description = "Something went wrong while loading this page.";

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText || "Error"}`;
    description =
      typeof error.data === "string"
        ? error.data
        : error.data?.message || error.statusText || description;
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            It looks like something unexpected happened while navigating. Please try again.
          </p>
          <Button asChild className="w-full">
            <Link to="/">Go back to projects</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
