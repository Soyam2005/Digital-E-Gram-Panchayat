import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { db } from "../firebase/firebase-config.js";
import { showAlert } from "../utils/alerts.js";

export async function loginUser(auth, email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const role = userData.role;

      // Store user data in sessionStorage
      sessionStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          role: role,
          ...userData,
        })
      );

      showAlert("success", "Login successful! Redirecting...");

      // Redirect based on role
      setTimeout(() => {
        redirectByRole(role);
      }, 1500);
    } else {
      showAlert(
        "error",
        "User profile not found. Please contact administrator."
      );
    }
  } catch (error) {
    console.error("Login error:", error);

    switch (error.code) {
      case "auth/user-not-found":
        showAlert("error", "No account found with this email address.");
        break;
      case "auth/wrong-password":
        showAlert("error", "Incorrect password. Please try again.");
        break;
      case "auth/invalid-email":
        showAlert("error", "Invalid email address format.");
        break;
      case "auth/too-many-requests":
        showAlert("error", "Too many failed attempts. Please try again later.");
        break;
      default:
        showAlert("error", "Login failed. Please try again.");
    }
  }
}

export async function redirectByRole(role) {
  switch (role) {
    case "citizen":
      window.location.href = "citizen-dashboard.html";
      break;
    case "staff":
      window.location.href = "staff-dashboard.html";
      break;
    case "officer":
      window.location.href = "officer-dashboard.html";
      break;
    default:
      showAlert("error", "Invalid user role. Please contact administrator.");
      break;
  }
}

export function logoutUser() {
  sessionStorage.removeItem("user");
  window.location.href = "index.html";
}

export function getCurrentUser() {
  const userStr = sessionStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
}

export function isAuthenticated() {
  return getCurrentUser() !== null;
}

export function requireAuth(requiredRole = null) {
  const user = getCurrentUser();

  if (!user) {
    window.location.href = "index.html";
    return false;
  }

  if (requiredRole && user.role !== requiredRole) {
    showAlert(
      "error",
      "Access denied. You do not have permission to view this page."
    );
    logoutUser();
    return false;
  }

  return true;
}
