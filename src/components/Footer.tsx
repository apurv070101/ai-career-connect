import { Leaf } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border py-10 px-4">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-display font-bold">
          <Leaf className="h-5 w-5 text-primary" />
          SkillBridge<span className="text-primary">AI</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 SkillBridgeAI — AI-Based Sustainable Hiring & Skill Development System
        </p>
      </div>
    </footer>
  );
};

export default Footer;
