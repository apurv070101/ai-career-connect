import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Handshake } from "lucide-react";

const CTASection = () => {
  return (
    <section id="cta" className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto text-center p-12 md:p-16 rounded-2xl border border-primary/20 bg-gradient-card overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10 bg-gradient-green" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Join the Sustainable
              <br />
              <span className="text-gradient-green">Hiring Revolution</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Be part of the movement that's transforming how IT talent meets opportunity — sustainably.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/upload-resume">
                <button className="group flex items-center gap-2 px-8 py-3.5 rounded-lg bg-gradient-green text-primary-foreground font-semibold transition-all hover:shadow-lg glow-green">
                  Get Started
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/register">
                <button className="flex items-center gap-2 px-8 py-3.5 rounded-lg border border-border bg-card/50 text-foreground font-semibold hover:border-primary/40 transition-all">
                  <Handshake className="h-4 w-4 text-primary" />
                  Partner With Us
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
