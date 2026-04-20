import { Link, useNavigate } from "react-router-dom";
import { Leaf, Menu, X, User } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { store } from "@/lib/store";
import { isAuthenticated, logoutAuth } from "@/lib/auth";

const navLinks = ["Problem", "Solution", "How It Works", "Impact", "Features"];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
  }, []);

  const handleLogout = () => {
    logoutAuth();
    store.logout();
    setIsLoggedIn(false);
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <Leaf className="h-6 w-6 text-primary" />
          <span>SkillBridge<span className="text-primary">AI</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`/#${link.toLowerCase().replace(/\s/g, "-")}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">Dashboard</Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm">Logout</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl"
          >
            <div className="flex flex-col p-4 gap-3">
              {navLinks.map((link) => (
                <a
                  key={link}
                  href={`/#${link.toLowerCase().replace(/\s/g, "-")}`}
                  className="text-sm text-muted-foreground py-2"
                  onClick={() => setOpen(false)}
                >
                  {link}
                </a>
              ))}
              <div className="pt-4 border-t border-border flex flex-col gap-2">
                {isLoggedIn ? (
                  <>
                    <Link to="/dashboard" onClick={() => setOpen(false)}>
                      <Button className="w-full" variant="secondary">Dashboard</Button>
                    </Link>
                    <Button onClick={() => { handleLogout(); setOpen(false); }} variant="outline" className="w-full">
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">Login</Button>
                    </Link>
                    <Link to="/register" onClick={() => setOpen(false)}>
                      <Button className="w-full">Get Started</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
