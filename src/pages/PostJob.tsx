import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { store } from "@/lib/store";

const PostJob = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [location, setLocation] = useState("");
    const [type, setType] = useState("Full-time");
    const [tags, setTags] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title || !company || !location) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsLoading(true);
        try {
            const postJobPromise = store.addJob({
                title,
                company,
                location,
                type,
                tags: tags.split(",").map(t => t.trim()).filter(Boolean)
            });

            navigate("/dashboard");
            toast.success("Posting job...");
            void postJobPromise
                .then(() => {
                    toast.success("Job posted successfully!");
                })
                .catch((error) => {
                    toast.error(error instanceof Error ? error.message : "Failed to post job.");
                });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to post job.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <Navbar />
            <div className="container mx-auto px-4 pt-24 pb-12">
                <div className="max-w-2xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Post a New Job</CardTitle>
                            <CardDescription>Target the right talent with AI-powered matching</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Job Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Senior React Developer"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company">Company Name</Label>
                                    <Input
                                        id="company"
                                        placeholder="e.g. TechCorp Inc."
                                        value={company}
                                        onChange={(e) => setCompany(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="location">Location</Label>
                                        <Input
                                            id="location"
                                            placeholder="e.g. Remote / Bangalore"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Job Type</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Full-time">Full-time</SelectItem>
                                                <SelectItem value="Part-time">Part-time</SelectItem>
                                                <SelectItem value="Contract">Contract</SelectItem>
                                                <SelectItem value="Internship">Internship</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tags">Skills / Tags (comma separated)</Label>
                                    <Input
                                        id="tags"
                                        placeholder="e.g. React, TypeScript, Node.js"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the role responsibilities and requirements..."
                                        className="min-h-[150px]"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="outline" type="button" onClick={() => navigate("/dashboard")}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Posting..." : "Post Job"}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default PostJob;
