import { store } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { buildApiUrl } from "@/lib/api";

const ResumeUpload = () => {
    const navigate = useNavigate();
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [analysisComplete, setAnalysisComplete] = useState(false);

    const [result, setResult] = useState<{
        role: string;
        skills: string[];
        matchScore: number;
        suggestions: string[];
        missingSkills: string[];
        recommendedCourses: string[];
    } | null>(null);

    const analyzeText = (text: string) => {
        const lowerText = text.toLowerCase();
        let role = "Software Engineer";
        let skills = ["JavaScript", "Git", "Problem Solving"];
        let matchScore = 75;
        let suggestions = ["Add more quantitative metrics", "Highlight team leadership"];

        // Keyword Counters
        const hasPython = lowerText.includes("python");
        const hasData = lowerText.includes("data");
        const hasAnalyst = lowerText.includes("analyst");
        const hasSql = lowerText.includes("sql");
        const hasPowerBi = lowerText.includes("power bi") || lowerText.includes("powerbi");
        const hasReact = lowerText.includes("react");
        const hasNode = lowerText.includes("node");
        const hasJava = lowerText.includes("java");

        if (hasData && (hasAnalyst || hasSql || hasPython || hasPowerBi)) {
            role = "Data Analyst";
            skills = ["Python", "SQL", "Power BI", "Excel", "EDA"];
            matchScore = 95;
            suggestions = ["Add GitHub link to Sales Project", "Certify in Tableau"];
            if (lowerText.includes("pandas")) skills.push("Pandas");
            if (lowerText.includes("numpy")) skills.push("NumPy");
        } else if (hasReact || lowerText.includes("frontend")) {
            role = "Senior React Developer";
            skills = ["React", "TypeScript", "Tailwind CSS", "Redux"];
            matchScore = 92;
            suggestions = ["Mention performance optimization techniques", "Add link to portfolio"];
        } else if (hasNode || hasJava || lowerText.includes("backend")) {
            role = "Backend Engineer";
            skills = ["Node.js", "Express", "PostgreSQL", "Docker"];
            matchScore = 88;
            suggestions = ["Detail API design experience", "Mention cloud deployment (AWS/GCP)"];
        } else if (hasPython && (lowerText.includes("ai") || lowerText.includes("machine learning"))) {
            role = "AI Engineer";
            skills = ["Python", "PyTorch", "TensorFlow", "MLOps"];
            matchScore = 90;
            suggestions = ["Highlight model deployment", "Showcase Kaggle competitions"];
        } else if (lowerText.includes("design") || lowerText.includes("ui") || lowerText.includes("ux")) {
            role = "Product Designer";
            skills = ["Figma", "User Research", "Prototyping", "Design Systems"];
            matchScore = 90;
            suggestions = ["Include case studies in portfolio", "Show process, not just final UI"];
        }

        return {
            role,
            skills,
            matchScore,
            suggestions,
            missingSkills: ["Docker", "Kubernetes"],
            recommendedCourses: ["Docker & Kubernetes: The Complete Guide", "Advanced System Design"]
        };
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setProgress(0);
        setResult(null);

        // Simulate scanning progress
        let progressValue = 0;
        const interval = setInterval(() => {
            progressValue += 10;
            if (progressValue > 90) clearInterval(interval);
            setProgress(Math.min(progressValue, 90));
        }, 500);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(buildApiUrl("/analyze-resume"), {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            // Map backend response to our frontend state structure
            const analysisResult = {
                role: data.predicted_role,
                skills: data.technical_skills,
                matchScore: data.match_score,
                suggestions: data.improvement_suggestions,
                missingSkills: data.missing_skills || [],
                recommendedCourses: data.recommended_courses || []
            };

            clearInterval(interval);
            setProgress(100);
            setAnalysisComplete(true);
            setIsUploading(false);
            setResult(analysisResult);

            await store.saveuserProfile({
                resumeUploaded: true,
                skills: analysisResult.skills,
                matchScore: analysisResult.matchScore
            });

            toast.success("Resume analyzed successfully by AI!");
        } catch (error) {
            console.error(error);
            clearInterval(interval);
            setIsUploading(false);
            setProgress(0);
            toast.error("Failed to connect to AI server. Is main.py running?");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-3xl mx-auto">
                    <h1 className="font-display text-3xl font-bold mb-2">Resume AI Analysis</h1>
                    <p className="text-muted-foreground mb-8">Upload your resume to get instant feedback and job matches.</p>

                    <div className="grid gap-8">
                        <Card className="border-dashed border-2">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                                    <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="font-semibold text-lg mb-2">Upload your resume</h3>
                                <p className="text-muted-foreground text-sm mb-6 max-w-sm">
                                    Drag and drop your PDF or DOCX file here, or click to browse.
                                    Max file size 5MB.
                                </p>
                                <input
                                    type="file"
                                    id="resume-upload"
                                    className="hidden"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleUpload}
                                    disabled={isUploading || analysisComplete}
                                />
                                <Button
                                    onClick={() => document.getElementById("resume-upload")?.click()}
                                    disabled={isUploading || analysisComplete}
                                >
                                    {isUploading ? "Analyzing..." : analysisComplete ? "Upload New" : "Select File"}
                                </Button>
                            </CardContent>
                        </Card>

                        {(isUploading || analysisComplete) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>AI Analysis Status</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>{isUploading ? "Scanning document..." : "Analysis Complete"}</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                    </div>

                                    {analysisComplete && result && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                                                <div className="flex gap-3">
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                    <div>
                                                        <h4 className="font-semibold text-green-900 dark:text-green-100">Strong Match Found</h4>
                                                        <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                                                            Your profile matches {result.matchScore}% with "{result.role}" roles.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-lg border bg-card">
                                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                        <CheckCircle className="h-4 w-4 text-green-500" /> Key Skills Detected
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result.skills.map(skill => (
                                                            <span key={skill} className="px-2 py-1 bg-secondary rounded text-xs font-medium">{skill}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-lg border bg-card">
                                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                                        <AlertCircle className="h-4 w-4 text-orange-500" /> Suggestions
                                                    </h4>
                                                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                                        {result.suggestions.map((suggestion, i) => (
                                                            <li key={i}>{suggestion}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>

                                            {/* Skill Gap & Courses Section */}
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                                                    <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-200 flex items-center gap-2">
                                                        Warning: Missing Critical Skills
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {result.missingSkills.length > 0 ? result.missingSkills.map(skill => (
                                                            <span key={skill} className="px-2 py-1 bg-amber-100 dark:bg-amber-900 rounded text-xs font-medium text-amber-800 dark:text-amber-200">
                                                                {skill}
                                                            </span>
                                                        )) : <span className="text-sm text-muted-foreground">None detected! Great job.</span>}
                                                    </div>
                                                </div>
                                                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                                    <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200 flex items-center gap-2">
                                                        Recommended Courses
                                                    </h4>
                                                    <ul className="text-sm list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                                                        {result.recommendedCourses.length > 0 ? result.recommendedCourses.map((course, i) => (
                                                            <li key={i}>{course}</li>
                                                        )) : <li className="list-none">No specific recommendations at this time.</li>}
                                                    </ul>
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full"
                                                onClick={() => navigate(`/jobs?search=${encodeURIComponent(result.role)}`)}
                                            >
                                                View Matched Jobs
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeUpload;
