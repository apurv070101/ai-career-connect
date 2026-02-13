import { motion } from "framer-motion";
import { Users, TrendingDown, Leaf } from "lucide-react";

const pillars = [
  {
    icon: Users,
    emoji: "🌱",
    title: "Social Sustainability",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    points: ["Fair skill-based evaluation", "Equal job access for all candidates", "Reduced unconscious hiring bias"],
  },
  {
    icon: TrendingDown,
    emoji: "📉",
    title: "Economic Sustainability",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    borderColor: "border-secondary/20",
    points: ["Reduced hiring costs by 40%", "Improved employee retention", "Faster recruitment cycles"],
  },
  {
    icon: Leaf,
    emoji: "🌍",
    title: "Environmental Sustainability",
    color: "text-accent-foreground",
    bgColor: "bg-accent/50",
    borderColor: "border-accent-foreground/20",
    points: ["100% paperless recruitment", "Reduced travel through AI pre-screening", "Lower carbon footprint"],
  },
];

const SolutionSection = () => {
  return (
    <section id="solution" className="section-padding bg-muted/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Our Solution</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 mb-4">
            A <span className="text-gradient-green">Sustainable</span> Hiring Revolution
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Our AI-powered system addresses all three pillars of sustainability.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`p-6 rounded-xl bg-gradient-card border ${pillar.borderColor} hover:glow-green transition-all`}
            >
              <div className={`inline-flex p-3 rounded-lg ${pillar.bgColor} mb-4`}>
                <pillar.icon className={`h-6 w-6 ${pillar.color}`} />
              </div>
              <h3 className="font-display font-semibold text-xl mb-4">{pillar.title}</h3>
              <ul className="space-y-3">
                {pillar.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-0.5">✓</span>
                    {point}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
