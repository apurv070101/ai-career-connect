import { motion } from "framer-motion";
import { Clock, AlertTriangle, GraduationCap, ShieldAlert } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Time-Consuming Screening",
    description: "Manual resume shortlisting takes weeks, delaying the entire recruitment cycle.",
  },
  {
    icon: GraduationCap,
    title: "Unclear Skill Requirements",
    description: "Students lack clarity about the specific IT skills industry actually demands.",
  },
  {
    icon: AlertTriangle,
    title: "Education-Industry Mismatch",
    description: "High disconnect between academic curricula and real-world industry needs.",
  },
  {
    icon: ShieldAlert,
    title: "Hiring Bias & Inefficiency",
    description: "Subjective manual screening leads to unconscious bias and missed talent.",
  },
];

const ProblemSection = () => {
  return (
    <section id="problem" className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-destructive uppercase tracking-wider">The Problem</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 mb-4">
            Why Traditional Hiring is <span className="text-destructive">Broken</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The current recruitment system wastes time, money, and human potential.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 rounded-xl bg-gradient-card border border-border hover:border-destructive/30 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive shrink-0">
                  <problem.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg mb-1">{problem.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
