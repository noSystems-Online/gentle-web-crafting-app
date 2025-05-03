
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { User } from "lucide-react";

const Header: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link 
          to="/" 
          className="text-xl font-bold text-primary flex items-center gap-2"
        >
          <div className="rounded-full bg-primary text-white p-1">
            <User className="h-5 w-5" />
          </div>
          SaaS Platform
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            to="/"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/features"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            to="/pricing"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/profile">Profile</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
