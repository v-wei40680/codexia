import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

export function LoginRequire() {
  return (
    <Card className="w-96">
      <CardHeader className="text-center">
        <CardTitle>Login Required</CardTitle>
        <CardDescription>
          Login to access early Advanced features
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p>Access your past conversations and more by logging in.</p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link to="/login" className="flex hover:text-primary items-center gap-1">
          <Button>
            <User className="w-4 h-4" /> Login
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}