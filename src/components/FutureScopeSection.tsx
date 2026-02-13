import { motion } from "framer-motion";
import { Sprout, University, LineChart, Brain } from "lucide-react";

const scopes = [
  { icon: Sprout, title: "Green Tech & ESG Jobs", description: "Expand to sustainability-focused and ESG job markets" },
  { icon: University, title: "University Integration", description: "Direct partnerships with universities for seamless placement" },
  { icon: LineChart, title: "Career Analytics Dashboard", description: "Advanced analytics for career trajectory planning" },
  { icon: Brain, title: "AI Skill Prediction", description: "Predictive models for future in-demand skills" },
];

const FutureScopeSection = () => {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Future Scope</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 mb-4">
            What's <span className="text-gradient-blue">Next</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {scopes.map((scope, i) => (
            <motion.div
              key={scope.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6 rounded-xl bg-gradient-card border border-border glow-border"
            >
              <div className="inline-flex p-3 rounded-lg bg-secondary/10 mb-4">
                <scope.icon className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-display font-semibold mb-2">{scope.title}</h3>
              <p className="text-sm text-muted-foreground">{scope.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FutureScopeSection;
