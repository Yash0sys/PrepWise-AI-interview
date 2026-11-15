import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { db } from "./firebaseAdmin.js";
import { sendOtpEmail } from "./services/mailer.js";
import {
  generateNumericOtp,
  saveOtp,
  verifyOtp,
  canSendOtp,
} from "./services/otpService.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

const interviewCovers = [
  "/adobe.png",
  "/amazon.png",
  "/facebook.png",
  "/hostinger.png",
  "/pinterest.png",
  "/quora.png",
  "/reddit.png",
  "/skype.png",
  "/spotify.png",
  "/telegram.png",
  "/tiktok.png",
  "/yahoo.png",
];

function getRandomInterviewCover() {
  const randomIndex = Math.floor(Math.random() * interviewCovers.length);
  return `/covers${interviewCovers[randomIndex]}`;
}

const feedbackSchema = z.object({
  totalScore: z.number(),
  categoryScores: z.tuple([
    z.object({
      name: z.literal("Communication Skills"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Technical Knowledge"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Problem Solving"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Cultural Fit"),
      score: z.number(),
      comment: z.string(),
    }),
    z.object({
      name: z.literal("Confidence and Clarity"),
      score: z.number(),
      comment: z.string(),
    }),
  ]),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  finalAssessment: z.string(),
});

// OTP Endpoints
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res
      .status(400)
      .json({ success: false, message: "A valid email address is required." });
  }

  const check = canSendOtp(email);
  if (!check.allowed) {
    return res
      .status(429)
      .json({ success: false, message: check.message, waitSeconds: check.waitSeconds });
  }

  const otp = generateNumericOtp(6);
  saveOtp(email, otp);

  try {
    await sendOtpEmail(email, otp);
    return res.status(200).json({
      success: true,
      message: `OTP sent to ${email} (valid for 5 minutes).`,
    });
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return res.status(500).json({
      success: false,
      message:
        "Failed to send email. Please check your Gmail SMTP configuration.",
    });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp, name } = req.body;

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP are required." });
  }

  const result = verifyOtp(email, otp);
  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.message });
  }

  // Resolve or create user profile for session
  const cleanEmail = email.toLowerCase().trim();
  let user = {
    id: "user_" + Buffer.from(cleanEmail).toString("hex").slice(0, 16),
    email: cleanEmail,
    name: name || cleanEmail.split("@")[0],
  };

  try {
    if (db) {
      const usersRef = db.collection("users");
      const snapshot = await usersRef.where("email", "==", cleanEmail).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        user = {
          id: doc.id,
          ...doc.data(),
        };
      } else {
        await usersRef.doc(user.id).set({
          email: user.email,
          name: user.name,
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn("Firestore user sync warning:", err.message);
  }

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully. Logged in!",
    user,
  });
});

app.get("/api/vapi/generate", (req, res) => {
  res.status(200).json({ success: true, data: "Thank you!" });
});

app.post("/api/vapi/generate", async (req, res) => {
  const { type, role, level, techstack, amount, userid } = req.body;

  try {
    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: typeof techstack === "string" ? techstack.split(",") : techstack,
      questions: JSON.parse(questions),
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interview);

    return res.status(200).json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Error generating interview:", error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

app.post("/api/feedback/generate", async (req, res) => {
  const { interviewId, userId, transcript, feedbackId } = req.body;

  try {
    const formattedTranscript = (transcript || [])
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;
    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);

    return res.status(200).json({ success: true, feedbackId: feedbackRef.id });
  } catch (error) {
    console.error("Error saving feedback:", error);
    return res.status(500).json({ success: false, error: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
