import { motion } from "framer-motion";
import { Clock, TrendingUp, BarChart3, Leaf } from "lucide-react";

const metrics = [
  { icon: Clock, value: "40%", label: "Reduction in Hiring Time", color: "text-primary" },
  { icon: TrendingUp, value: "30%", label: "Improvement in Placement Accuracy", color: "text-secondary" },
  { icon: BarChart3, value: "60%", label: "Reduced Skill Mismatch", color: "text-accent-foreground" },
  { icon: Leaf, value: "100%", label: "Paperless Recruitment", color: "text-primary" },
];

const MetricsSection = () => {
  return (
    <section id="impact" className="section-padding bg-muted/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Impact</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 mb-4">
            Sustainability <span className="text-gradient-green">Impact</span> Metrics
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Measurable outcomes driving real change in the hiring ecosystem.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-8 rounded-xl bg-gradient-card border border-border glow-border hover:glow-green transition-all"
            >
              <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-4">
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div className={`text-4xl font-display font-bold ${metric.color} mb-2`}>{metric.value}</div>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;
