import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Check } from "lucide-react";
import { store, Job } from "@/lib/store";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const getSearchTokens = (value: string) =>
    value
        .toLowerCase()
        .split(/[\s,/+-]+/)
        .map(token => token.trim())
        .filter(Boolean);

const matchesJobSearch = (job: Job, query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;

    const haystack = [
        job.title,
        job.company,
        job.location,
        job.type,
        ...job.tags,
    ]
        .join(" ")
        .toLowerCase();

    if (haystack.includes(normalizedQuery)) {
        return true;
    }

    const tokens = getSearchTokens(normalizedQuery);
    return tokens.some(token => haystack.includes(token));
};

const Jobs = () => {
    const [searchParams] = useSearchParams();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [appliedJobs, setAppliedJobs] = useState<Array<number | string>>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showingFallbackResults, setShowingFallbackResults] = useState(false);

    useEffect(() => {
        const loadJobs = async () => {
            const allJobs = await store.getJobs();
            const query = searchParams.get("search");

            if (query) {
                setSearchTerm(query);
                const filtered = allJobs.filter(job => matchesJobSearch(job, query));
                if (filtered.length > 0) {
                    setJobs(filtered);
                    setShowingFallbackResults(false);
                } else {
                    setJobs(allJobs);
                    setShowingFallbackResults(allJobs.length > 0);
                }
            } else {
                setJobs(allJobs);
                setShowingFallbackResults(false);
            }

            const apps = await store.getApplications();
            setAppliedJobs(apps.map(a => a.jobId));
        };

        void loadJobs();
    }, [searchParams]);

    const handleApply = async (job: Job) => {
        try {
            await store.applyToJob(job);
            setAppliedJobs([...appliedJobs, job.id]);
            toast.success(`Applied to ${job.title} at ${job.company}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not submit application.");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-4xl mx-auto">
                    <h1 className="font-display text-3xl font-bold mb-6">Find Your Next Role</h1>

                    <div className="relative mb-8">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                            className="pl-10 h-12"
                            placeholder="Search for jobs, companies, or keywords..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                const query = e.target.value.toLowerCase();
                                void (async () => {
                                    const allJobs = await store.getJobs();
                                    setJobs(allJobs.filter(job => matchesJobSearch(job, query)));
                                    setShowingFallbackResults(false);
                                })();
                            }}
                        />
                    </div>

                    {showingFallbackResults && searchTerm && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            No exact matches found for "{searchTerm}". Showing all available companies and jobs instead.
                        </div>
                    )}

                    <div className="grid gap-4">
                        {jobs.map((job) => {
                            const isApplied = appliedJobs.some((appliedJobId) => String(appliedJobId) === String(job.id));
                            return (
                                <Card key={job.id} className="transition-all hover:shadow-md">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-semibold text-xl mb-1">{job.title}</h3>
                                                <div className="text-muted-foreground mb-2">{job.company}</div>
                                                {job.postedBy ? (
                                                    <div className="text-xs text-muted-foreground mb-2">
                                                        Added by recruiter: {job.postedBy}
                                                    </div>
                                                ) : null}
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="secondary" className="font-normal">
                                                        <MapPin className="h-3 w-3 mr-1" /> {job.location}
                                                    </Badge>
                                                    <Badge variant="outline" className="font-normal">{job.type}</Badge>
                                                    {job.tags.map(tag => (
                                                        <Badge key={tag} variant="outline" className="font-normal bg-primary/5">{tag}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => !isApplied && handleApply(job)}
                                                variant={isApplied ? "secondary" : "default"}
                                                disabled={isApplied}
                                            >
                                                {isApplied ? <><Check className="mr-2 h-4 w-4" /> Applied</> : "Apply Now"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {jobs.length === 0 && (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center text-muted-foreground">
                                No jobs found for "{searchTerm}". Try a different role, company name, or keyword.
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Jobs;
