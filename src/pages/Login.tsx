import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { loginWithFirebase } from "@/lib/auth";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getPostLoginPath = (role: "candidate" | "recruiter") => {
    return role === "candidate" ? "/upload-resume" : "/dashboard";
  };

  const handleLogin = async (role: "candidate" | "recruiter") => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginWithFirebase(email, password, role);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(getPostLoginPath(user.role));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderCredentialFields = (emailId: string, passwordId: string, emailPlaceholder: string) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={emailId}>Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id={emailId}
            placeholder={emailPlaceholder}
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={passwordId}>Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id={passwordId}
            type="password"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
    </>
  );

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
            <TabsTrigger value="candidate">Candidate</TabsTrigger>
            <TabsTrigger value="recruiter">Recruiter</TabsTrigger>
          </TabsList>

          <TabsContent value="candidate">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Login to your candidate account after completing email OTP verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderCredentialFields("email-candidate", "password-candidate", "name@example.com")}
                <p className="text-xs text-muted-foreground">
                  If login setup is incomplete, add <span className="font-semibold">FIREBASE_WEB_API_KEY</span> in <span className="font-semibold">model/.env</span> and restart the backend.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" onClick={() => handleLogin("candidate")} disabled={isLoading}>
                  {isLoading ? "Processing..." : "Login as Candidate"}
                </Button>
                <div className="text-center text-sm">
                  Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="recruiter">
            <Card>
              <CardHeader>
                <CardTitle>Recruiter Login</CardTitle>
                <CardDescription>Access your hiring dashboard after completing email OTP verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderCredentialFields("email-recruiter", "password-recruiter", "hr@company.com")}
                <p className="text-xs text-muted-foreground">
                  If login setup is incomplete, add <span className="font-semibold">FIREBASE_WEB_API_KEY</span> in <span className="font-semibold">model/.env</span> and restart the backend.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" variant="secondary" onClick={() => handleLogin("recruiter")} disabled={isLoading}>
                  {isLoading ? "Processing..." : "Login as Recruiter"}
                </Button>
                <div className="text-center text-sm">
                  Need to hire? <Link to="/register" className="text-primary hover:underline">Create company account</Link>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Login;
