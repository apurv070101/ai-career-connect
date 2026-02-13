import { motion } from "framer-motion";
import { Upload, Cpu, GitCompare, Search, BookOpen, Building2 } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload Resume", description: "Student uploads their resume to the platform" },
  { icon: Cpu, title: "AI Skill Extraction", description: "AI analyzes and extracts technical skills" },
  { icon: GitCompare, title: "Job Role Matching", description: "System matches skills with IT job roles" },
  { icon: Search, title: "Skill Gap Analysis", description: "Identifies missing skills for target roles" },
  { icon: BookOpen, title: "Course Recommendations", description: "Suggests relevant courses to bridge gaps" },
  { icon: Building2, title: "Shortlisted Candidates", description: "Companies see top-matched candidates" },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">System Flow</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 mb-4">
            How It <span className="text-gradient-green">Works</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A seamless AI-driven pipeline from resume to recruitment.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto relative">
          {/* Vertical line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

          <div className="space-y-8 md:space-y-0">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`md:flex items-center gap-8 md:py-6 ${isLeft ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  <div className={`flex-1 ${isLeft ? "md:text-right" : "md:text-left"}`}>
                    <div className={`p-5 rounded-xl bg-gradient-card border border-border glow-border inline-block ${isLeft ? "md:ml-auto" : ""}`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <step.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground mb-0.5">Step {i + 1}</div>
                          <h3 className="font-display font-semibold">{step.title}</h3>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="hidden md:flex shrink-0 w-4 h-4 rounded-full bg-primary border-4 border-background relative z-10" />

                  <div className="flex-1" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
