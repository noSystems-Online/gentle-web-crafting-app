
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <CardTitle className="text-4xl font-bold text-primary">404</CardTitle>
          <CardDescription className="text-xl">Page Not Found</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-sm text-muted-foreground">
            Path: {location.pathname}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <Link to="/">Return Home</Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NotFound;
