import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from "firebase/firestore";
import { db } from "../firebase/client";

export async function getInterviewById(id) {
  try {
    if (!db || !id) return null;
    const interviewDoc = await getDoc(doc(db, "interviews", id));
    if (!interviewDoc.exists()) return null;
    return { id: interviewDoc.id, ...interviewDoc.data() };
  } catch (err) {
    console.error("getInterviewById error:", err);
    return null;
  }
}

export async function getFeedbackByInterviewId({ interviewId, userId }) {
  try {
    if (!db || !interviewId || !userId) return null;
    const q = query(
      collection(db, "feedback"),
      where("interviewId", "==", interviewId),
      where("userId", "==", userId),
      firestoreLimit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const feedbackDoc = querySnapshot.docs[0];
    return { id: feedbackDoc.id, ...feedbackDoc.data() };
  } catch (err) {
    console.error("getFeedbackByInterviewId error:", err);
    return null;
  }
}

export async function getLatestInterviews({ userId, limit = 20 }) {
  try {
    if (!db) return [];
    let q;
    if (userId) {
      q = query(
        collection(db, "interviews"),
        where("finalized", "==", true),
        where("userId", "!=", userId),
        orderBy("createdAt", "desc"),
        firestoreLimit(limit)
      );
    } else {
      q = query(
        collection(db, "interviews"),
        where("finalized", "==", true),
        orderBy("createdAt", "desc"),
        firestoreLimit(limit)
      );
    }

    const interviews = await getDocs(q);
    return interviews.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err) {
    console.error("getLatestInterviews error:", err);
    return [];
  }
}

export async function getInterviewsByUserId(userId) {
  try {
    if (!db || !userId) return [];
    const q = query(
      collection(db, "interviews"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const interviews = await getDocs(q);
    return interviews.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
  } catch (err) {
    console.error("getInterviewsByUserId error:", err);
    return [];
  }
}

export async function createFeedback({ interviewId, userId, transcript, feedbackId }) {
  try {
    const response = await fetch("/api/feedback/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewId, userId, transcript, feedbackId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating feedback:", error);
    return { success: false };
  }
}

export async function signUpUser({ uid, name, email }) {
  try {
    if (!db) {
      return { success: true, message: "Account created successfully. Please sign in." };
    }
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return { success: false, message: "User already exists. Please sign in." };
    }

    await setDoc(doc(db, "users", uid), { name, email });

    return { success: true, message: "Account created successfully. Please sign in." };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, message: "Failed to create account. Please try again." };
  }
}

export async function sendOtp(email) {
  try {
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (error) {
    console.error("sendOtp error:", error);
    return { success: false, message: "Network error sending OTP. Please try again." };
  }
}

export async function verifyOtp(email, otp, name) {
  try {
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, name }),
    });
    return await res.json();
  } catch (error) {
    console.error("verifyOtp error:", error);
    return { success: false, message: "Network error verifying OTP. Please try again." };
  }
}
