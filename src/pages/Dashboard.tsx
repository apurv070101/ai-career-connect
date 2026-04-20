import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload } from "lucide-react";

import { store, Application, RecruiterStats } from "@/lib/store";

const Dashboard = () => {
    const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
    const [applications, setApplications] = useState<Application[]>([]);
    const [profileStats, setProfileStats] = useState({ matchScore: 0, resumeUploaded: false });
    const [postedJobs, setPostedJobs] = useState<Array<{ id: number | string; title: string; company: string; postedBy?: string }>>([]);
    const [shortlistedCandidates, setShortlistedCandidates] = useState<Array<{ name: string; email: string; detectedRole?: string; skills: string[]; matchScore: number }>>([]);
    const [recruiterStats, setRecruiterStats] = useState<RecruiterStats>({
        activeJobs: 0,
        totalApplicants: 0,
        interviewsScheduled: 0,
    });

    useEffect(() => {
        const userRole = localStorage.getItem("userRole") as "candidate" | "recruiter";
        if (userRole) setRole(userRole);

        const loadDashboardData = async () => {
            if (userRole === "recruiter") {
                void store.getRecruiterStats().then(setRecruiterStats).catch(() => undefined);
                void store.getMyJobs().then((jobs) => setPostedJobs(jobs.slice(0, 5))).catch(() => undefined);
                void store.getShortlistedCandidates().then(setShortlistedCandidates).catch(() => undefined);
                return;
            }

            const [apps, profile] = await Promise.all([
                store.getApplications(),
                store.getUserProfile(),
            ]);

            setApplications(apps);
            if (profile) {
                setProfileStats({
                    matchScore: profile.matchScore,
                    resumeUploaded: profile.resumeUploaded
                });
            }
        };

        void loadDashboardData();
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="font-display text-3xl font-bold">
                        {role === "candidate" ? "Candidate Dashboard" : "Recruiter Dashboard"}
                    </h1>
                    {/* ... (buttons remain same) */}
                    {role === "recruiter" && (
                        <Link to="/post-job">
                            <Button>Post New Job</Button>
                        </Link>
                    )}
                    {role === "candidate" && (
                        <Link to="/upload-resume">
                            <Button className="gap-2">
                                <Upload className="h-4 w-4" /> {profileStats.resumeUploaded ? "Update Resume" : "Analyze New Resume"}
                            </Button>
                        </Link>
                    )}
                </div>

                {role === "candidate" ? (
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
                                    <div className="text-2xl font-bold">{applications.length}</div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Interviews</CardTitle>
                                    <div className="text-2xl font-bold">
                                        {applications.filter(a => a.status === "Interview").length}
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Profile Match</CardTitle>
                                    <div className={`text-2xl font-bold ${profileStats.matchScore > 70 ? "text-green-500" : "text-muted-foreground"}`}>
                                        {profileStats.matchScore > 0 ? `${profileStats.matchScore}%` : "N/A"}
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Applications</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {applications.length > 0 ? (
                                    <div className="space-y-4">
                                        {applications.map((app) => (
                                            <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div>
                                                    <div className="font-semibold">{app.role}</div>
                                                    <div className="text-sm text-muted-foreground">{app.company} • Applied {app.date}</div>
                                                </div>
                                                <Badge variant={app.status === "Interview" ? "default" : app.status === "Rejected" ? "destructive" : "secondary"}>
                                                    {app.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No applications yet. <Link to="/jobs" className="text-primary hover:underline">Find a job</Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    // Recruiter view... (kept same for now)
                    <div className="grid gap-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
                                    <div className="text-2xl font-bold">{recruiterStats.activeJobs}</div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
                                    <div className="text-2xl font-bold">{recruiterStats.totalApplicants}</div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Interviews Scheduled</CardTitle>
                                    <div className="text-2xl font-bold">{recruiterStats.interviewsScheduled}</div>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Posted Jobs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {postedJobs.map((job) => (
                                        <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <div className="font-semibold">{job.title}</div>
                                                <div className="text-sm text-muted-foreground">{job.company}</div>
                                                {job.postedBy ? (
                                                    <div className="text-xs text-muted-foreground">Posted by {job.postedBy}</div>
                                                ) : null}
                                            </div>
                                            <Badge variant="outline">
                                                Active
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Shortlisted Candidates Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top AI-Matched Candidates</CardTitle>
                                <CardDescription>Candidates with &gt;80% match score from AI analysis</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {shortlistedCandidates.length > 0 ? (
                                    <div className="space-y-4">
                                        {shortlistedCandidates.map((candidate, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-green-50/50 dark:bg-green-900/10">
                                                <div>
                                                    <div className="font-semibold">{candidate.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {candidate.detectedRole || "Candidate"} • {candidate.email}
                                                    </div>
                                                    <div className="flex gap-1 mt-2">
                                                        {candidate.skills.slice(0, 3).map(skill => (
                                                            <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-green-600">{candidate.matchScore}%</div>
                                                    <div className="text-xs text-muted-foreground">Match Score</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No top candidates found yet. Wait for candidates to upload resumes.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};


export default Dashboard;
