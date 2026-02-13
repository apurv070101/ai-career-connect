import { motion } from "framer-motion";
import { FileSearch, Target, Briefcase, BookOpen, ListChecks, Filter, LayoutDashboard } from "lucide-react";

const studentFeatures = [
  { icon: FileSearch, title: "AI Resume Analysis", description: "Instant AI-powered resume parsing and skill extraction" },
  { icon: Target, title: "Skill Gap Detection", description: "Identify missing skills for your dream IT role" },
  { icon: Briefcase, title: "IT Job Matching", description: "Smart matching with relevant job openings" },
  { icon: BookOpen, title: "Course Recommendations", description: "Personalized learning paths to bridge skill gaps" },
];

const companyFeatures = [
  { icon: ListChecks, title: "Automated Shortlisting", description: "AI-ranked candidate lists in seconds" },
  { icon: Filter, title: "Skill-Based Filtering", description: "Filter candidates by exact skill requirements" },
  { icon: LayoutDashboard, title: "Recruiter Dashboard", description: "Comprehensive analytics and candidate management" },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="section-padding">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Features</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 mb-4">
            Powerful Tools for <span className="text-gradient-green">Everyone</span>
          </h2>
        </motion.div>

        <div className="max-w-5xl mx-auto space-y-16">
          {/* Students */}
          <div>
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-display text-xl font-semibold mb-6 text-center"
            >
              🎓 For Students
            </motion.h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {studentFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-xl bg-gradient-card border border-border glow-border hover:border-primary/30 transition-all"
                >
                  <f.icon className="h-5 w-5 text-primary mb-3" />
                  <h4 className="font-display font-semibold text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div>
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-display text-xl font-semibold mb-6 text-center"
            >
              🏢 For Companies
            </motion.h3>
            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {companyFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="p-5 rounded-xl bg-gradient-card border border-border glow-border hover:border-secondary/30 transition-all"
                >
                  <f.icon className="h-5 w-5 text-secondary mb-3" />
                  <h4 className="font-display font-semibold text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
