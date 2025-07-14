import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuthDialogProps {
  onAuthSuccess: (token: string) => void;
}

export const AuthDialog = ({ onAuthSuccess }: AuthDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateUsername = (username: string) => {
    // Accept either a valid email or a valid phone number (10+ digits)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10,}$/;
    return emailRegex.test(username) || phoneRegex.test(username);
  };
  const validatePassword = (password: string) => {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password); // at least 8 chars, letters & numbers
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUsername(loginData.username)) {
      toast({
        title: "Invalid email or phone",
        description: "Please enter a valid email address or phone number (10+ digits).",
        variant: "destructive",
      });
      return;
    }
    if (!validatePassword(loginData.password)) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters and contain both letters and numbers.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Login successful!",
          description: "Welcome back to your planner.",
        });
        onAuthSuccess(data.token);
        navigate("/");
      } else {
        toast({
          title: "Login failed",
          description: data.message || "Please check your credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUsername(registerData.username)) {
      toast({
        title: "Invalid email or phone",
        description: "Please enter a valid email address or phone number (10+ digits).",
        variant: "destructive",
      });
      return;
    }
    if (!validatePassword(registerData.password)) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters and contain both letters and numbers.",
        variant: "destructive",
      });
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerData.username,
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Registration successful!",
          description: "Your account has been created. Please log in.",
        });
        if (data.message && data.message.toLowerCase().includes('verify your account')) {
          toast({
            title: "Check your email",
            description: "We've sent you a verification link. Please check your inbox to verify your account before logging in.",
          });
        }
        setActiveTab("login");
        setLoginData({ username: registerData.username, password: "" });
        setRegisterData({ username: "", password: "", confirmPassword: "" });
      } else {
        toast({
          title: "Registration failed",
          description: data.message || "Please try again with different credentials.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (username: string) => {
    if (!validateUsername(username)) {
      toast({
        title: "Invalid email or phone",
        description: "Please enter a valid email address or phone number (10+ digits) to resend verification.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Verification email sent!",
          description: data.message || "Please check your inbox.",
        });
      } else {
        toast({
          title: "Resend failed",
          description: data.message || "Unable to resend verification email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to Daily Life Planner</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-username">Email or Phone</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-username"
                      type="text"
                      placeholder="Enter your email or phone number"
                      value={loginData.username}
                      onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground"
                      tabIndex={-1}
                      onClick={() => setShowLoginPassword((v) => !v)}
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <div className="text-center mt-2">
                  <button
                    type="button"
                    className="text-sm text-primary underline disabled:opacity-50"
                    disabled={!validateUsername(loginData.username) || isLoading}
                    onClick={() => handleResendVerification(loginData.username)}
                  >
                    Resend verification email
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Email or Phone</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Enter your email or phone number"
                      value={registerData.username}
                      onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Choose a password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground"
                      tabIndex={-1}
                      onClick={() => setShowRegisterPassword((v) => !v)}
                      aria-label={showRegisterPassword ? "Hide password" : "Show password"}
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-muted-foreground"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}; 