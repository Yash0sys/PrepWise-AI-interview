import { useState, useEffect } from "react";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { auth } from "../firebase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../context/AuthContext";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

import { Form } from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { signUpUser, sendOtp, verifyOtp } from "../lib/actions";
import FormField from "./FormField";

const AuthForm = ({ type }) => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const isSignIn = type === "sign-in";

  // Login method toggle for sign-in: "otp" (default) or "password"
  const [loginMethod, setLoginMethod] = useState("otp");

  // OTP flow states
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [pendingUserData, setPendingUserData] = useState(null);

  // Form schema adapts based on mode
  const authFormSchema = z.object({
    name:
      !isSignIn
        ? z.string().min(2, "Name must be at least 2 characters")
        : z.string().optional(),
    email: z.string().email("Please enter a valid email address"),
    password:
      isSignIn && loginMethod === "otp"
        ? z.string().optional()
        : z.string().min(6, "Password must be at least 6 characters"),
  });

  const form = useForm({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Countdown timer for resending OTP
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle Initial Form Submit (Send OTP or Password Login)
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    const email = data.email.trim();

    try {
      // 1. If using OTP (either on Sign-Up or OTP Sign-In)
      if (!isSignIn || loginMethod === "otp") {
        setPendingUserData({
          email,
          name: data.name || email.split("@")[0],
          password: data.password || "",
        });

        toast.loading("Sending 5-minute OTP code...", { id: "otp-send" });
        const res = await sendOtp(email);
        toast.dismiss("otp-send");

        if (res.success) {
          toast.success(res.message || `OTP sent to ${email} (valid for 5 mins)`);
          setShowOtpScreen(true);
          setResendTimer(25);
        } else {
          toast.error(res.message || "Failed to send OTP code. Please try again.");
        }
      } else {
        // 2. Standard Password Login
        if (!auth) {
          toast.error("Firebase Auth is not available.");
          return;
        }

        toast.loading("Signing in...", { id: "pass-login" });
        const userCred = await signInWithEmailAndPassword(auth, email, data.password);
        toast.dismiss("pass-login");

        loginUser({
          id: userCred.user.uid,
          email: userCred.user.email,
          name: userCred.user.displayName || email.split("@")[0],
        });

        toast.success("Signed in successfully!");
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(`Authentication error: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP Verification and Login into the Project
  const handleVerifyOtpAndLogin = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }

    if (!pendingUserData?.email) {
      toast.error("Session expired. Please request a new code.");
      setShowOtpScreen(false);
      return;
    }

    setIsSubmitting(true);
    toast.loading("Verifying OTP...", { id: "otp-verify" });

    try {
      const { email, name, password } = pendingUserData;

      // Verify OTP against in-memory 5-min TTL store
      const verifyRes = await verifyOtp(email, otpCode, name);
      toast.dismiss("otp-verify");

      if (!verifyRes.success) {
        toast.error(verifyRes.message || "Invalid or expired OTP. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // If user provided a password on Sign Up, also create in Firebase if possible
      if (!isSignIn && password && auth) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          if (name && userCredential?.user) {
            await updateProfile(userCredential.user, { displayName: name });
          }
          await signUpUser({
            uid: userCredential.user.uid,
            name,
            email,
          });
        } catch (fbErr) {
          console.warn("Firebase Auth registration fallback:", fbErr.message);
        }
      }

      // Complete login directly with the user profile
      const loggedUser = verifyRes.user || {
        id: "user_" + Date.now(),
        email,
        name,
      };

      loginUser(loggedUser);
      toast.success("OTP verified! Welcome to PrepWise.");
      setShowOtpScreen(false);
      setPendingUserData(null);
      navigate("/");
    } catch (error) {
      console.error("Login verification error:", error);
      toast.dismiss();
      toast.error(`Failed to login: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resending OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || !pendingUserData?.email) return;

    setIsSubmitting(true);
    toast.loading("Sending new OTP...", { id: "otp-resend" });

    try {
      const res = await sendOtp(pendingUserData.email);
      toast.dismiss("otp-resend");

      if (res.success) {
        toast.success(`New 5-min code sent to ${pendingUserData.email}`);
        setResendTimer(25);
      } else {
        toast.error(res.message || "Failed to resend code.");
      }
    } catch (err) {
      toast.dismiss("otp-resend");
      toast.error("Error resending code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <img src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">PrepWise</h2>
        </div>

        <h3>Practice job interviews with AI</h3>

        {/* STEP 2: OTP Entry & Direct Login Screen */}
        {showOtpScreen ? (
          <form onSubmit={handleVerifyOtpAndLogin} className="w-full space-y-6 mt-4 form">
            <div className="text-center space-y-2">
              <p className="text-sm text-light-100">
                Enter the 6-digit code sent to:
              </p>
              <p className="font-semibold text-primary-200">
                {pendingUserData?.email}
              </p>
              <p className="text-xs text-light-400">
                (Valid for 5 minutes)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-light-100">
                One-Time Password (OTP)
              </label>
              <Input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="input text-center text-2xl tracking-[8px] font-mono font-bold"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <Button
              className="btn"
              type="submit"
              disabled={isSubmitting || otpCode.trim().length !== 6}
            >
              {isSubmitting ? "Logging in..." : "Verify OTP & Login"}
            </Button>

            <div className="flex flex-col items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isSubmitting}
                className="text-sm text-primary-200 hover:underline disabled:text-gray-500 disabled:no-underline cursor-pointer"
              >
                {resendTimer > 0
                  ? `Resend code in ${resendTimer}s`
                  : "Didn't receive the code? Resend"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOtpScreen(false);
                  setOtpCode("");
                }}
                className="text-xs text-light-100 hover:text-white underline cursor-pointer"
              >
                Change email / Back
              </button>
            </div>
          </form>
        ) : (
          /* STEP 1: Credentials Form */
          <>
            {/* If Sign-In, offer tabs for OTP vs Password */}
            {isSignIn && (
              <div className="flex bg-dark-200 rounded-full p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setLoginMethod("otp")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                    loginMethod === "otp"
                      ? "bg-primary-200 text-dark-100"
                      : "text-light-100 hover:text-white"
                  }`}
                >
                  Email OTP Code
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("password")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                    loginMethod === "password"
                      ? "bg-primary-200 text-dark-100"
                      : "text-light-100 hover:text-white"
                  }`}
                >
                  Password
                </button>
              </div>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full space-y-6 mt-2 form"
              >
                {!isSignIn && (
                  <FormField
                    control={form.control}
                    name="name"
                    label="Name"
                    placeholder="Your Name"
                    type="text"
                  />
                )}

                <FormField
                  control={form.control}
                  name="email"
                  label="Email"
                  placeholder="Your email address"
                  type="email"
                />

                {(!isSignIn || loginMethod === "password") && (
                  <FormField
                    control={form.control}
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    type="password"
                  />
                )}

                <Button className="btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Sending..."
                    : isSignIn
                    ? loginMethod === "otp"
                      ? "Send OTP to Login"
                      : "Sign In"
                    : "Send Verification OTP"}
                </Button>
              </form>
            </Form>

            <p className="text-center">
              {isSignIn ? "No account yet?" : "Have an account already?"}
              <Link
                to={!isSignIn ? "/sign-in" : "/sign-up"}
                className="font-bold text-user-primary ml-1"
              >
                {!isSignIn ? "Sign In" : "Sign Up"}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
