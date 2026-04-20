import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Lock, Mail, User, Building } from "lucide-react";
import { toast } from "sonner";
import { requestRegistrationOtp, verifyRegistrationOtp } from "@/lib/auth";

const Register = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // Form States
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [company, setCompany] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [pendingRole, setPendingRole] = useState<"candidate" | "recruiter" | null>(null);
    const [pendingEmail, setPendingEmail] = useState("");
    const [devOtp, setDevOtp] = useState("");

    const handleRegister = async (role: "candidate" | "recruiter") => {
        if (!email || !password || (role === "candidate" && !name) || (role === "recruiter" && !company)) {
            toast.error("Please fill in all fields.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await requestRegistrationOtp({
                name: role === "candidate" ? name : company,
                email,
                password,
                role,
                company: role === "recruiter" ? company : undefined
            });
            setPendingRole(role);
            setPendingEmail(result.email);
            setDevOtp(result.devOtp || "");
            if (result.otpDelivery === "email_sent") {
                toast.success("OTP sent to your email.");
            } else {
                toast.warning("SMTP is not configured. Use the demo OTP shown on screen.");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to start registration.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!pendingEmail || !otpCode) {
            toast.error("Enter the OTP sent to your email.");
            return;
        }

        setIsLoading(true);
        try {
            await verifyRegistrationOtp(pendingEmail, otpCode);
            toast.success("Email verified and account created.");
            setDevOtp("");
            navigate("/login");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "OTP verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold">
                        <Leaf className="h-8 w-8 text-primary" />
                        <span>SkillBridge<span className="text-primary">AI</span></span>
                    </Link>
                </div>

                <Tabs defaultValue="candidate" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="candidate">I'm a Candidate</TabsTrigger>
                        <TabsTrigger value="recruiter">I'm a Recruiter</TabsTrigger>
                    </TabsList>

                    <TabsContent value="candidate">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Account</CardTitle>
                                <CardDescription>Register, verify your email with OTP, then login</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pendingRole === "candidate" ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="candidate-otp">Email OTP</Label>
                                            <Input
                                                id="candidate-otp"
                                                placeholder="Enter OTP from your email"
                                                value={otpCode}
                                                onChange={(e) => setOtpCode(e.target.value)}
                                            />
                                        </div>
                                        {devOtp ? (
                                            <p className="text-xs text-muted-foreground">
                                                Demo OTP (local dev): <span className="font-semibold">{devOtp}</span>
                                            </p>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="name"
                                                    placeholder="John Doe"
                                                    className="pl-9"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email"
                                                    placeholder="name@example.com"
                                                    className="pl-9"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    className="pl-9"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4">
                                <Button
                                    className="w-full"
                                    onClick={() => pendingRole === "candidate" ? handleVerifyOtp() : handleRegister("candidate")}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Processing..." : pendingRole === "candidate" ? "Verify OTP" : "Send OTP"}
                                </Button>
                                <div className="text-center text-sm">
                                    Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    <strong>Note:</strong> Registration now uses Firebase email OTP verification before the account is created.
                                </div>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                    <TabsContent value="recruiter">
                        <Card>
                            <CardHeader>
                                <CardTitle>Company Registration</CardTitle>
                                <CardDescription>Register, verify your email with OTP, then login</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {pendingRole === "recruiter" ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="recruiter-otp">Email OTP</Label>
                                            <Input
                                                id="recruiter-otp"
                                                placeholder="Enter OTP from your email"
                                                value={otpCode}
                                                onChange={(e) => setOtpCode(e.target.value)}
                                            />
                                        </div>
                                        {devOtp ? (
                                            <p className="text-xs text-muted-foreground">
                                                Demo OTP (local dev): <span className="font-semibold">{devOtp}</span>
                                            </p>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="company">Company Name</Label>
                                            <div className="relative">
                                                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="company"
                                                    placeholder="Acme Inc."
                                                    className="pl-9"
                                                    value={company}
                                                    onChange={(e) => setCompany(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email-recruiter">Work Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="email-recruiter"
                                                    placeholder="hr@company.com"
                                                    className="pl-9"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password-recruiter">Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="password-recruiter"
                                                    type="password"
                                                    className="pl-9"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4">
                                <Button
                                    className="w-full"
                                    variant="secondary"
                                    onClick={() => pendingRole === "recruiter" ? handleVerifyOtp() : handleRegister("recruiter")}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Processing..." : pendingRole === "recruiter" ? "Verify OTP" : "Send OTP"}
                                </Button>
                                <div className="text-center text-sm">
                                    Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
                                </div>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Register;
