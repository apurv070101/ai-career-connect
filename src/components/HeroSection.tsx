import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Upload, Briefcase, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-glow-pulse" />
            AI-Powered Sustainable Hiring
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6">
            Building a{" "}
            <span className="text-gradient-green">Sustainable</span>
            <br />
            Employment Ecosystem
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Paperless recruitment. Skill-based fair hiring. Reduced hiring time.
            A career-ready workforce — powered by AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/upload-resume">
              <button className="group flex items-center gap-2 px-8 py-3.5 rounded-lg bg-gradient-green text-primary-foreground font-semibold text-base transition-all hover:shadow-lg glow-green">
                <Upload className="h-4 w-4" />
                Upload Resume
                <ArrowRight className="h-4 w-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" />
              </button>
            </Link>
            <Link to={localStorage.getItem("userRole") === "recruiter" ? "/post-job" : "/register"}>
              <button className="flex items-center gap-2 px-8 py-3.5 rounded-lg border border-border bg-card/50 text-foreground font-semibold text-base hover:border-primary/40 hover:bg-card transition-all">
                <Briefcase className="h-4 w-4 text-secondary" />
                Post a Job
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          {[
            { value: "10K+", label: "Resumes Analyzed" },
            { value: "500+", label: "Companies" },
            { value: "95%", label: "Accuracy Rate" },
            { value: "100%", label: "Paperless" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-display font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
