// handles login and redirect according to user role
import { auth } from "./firebase/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { redirectByRole, loginUser } from "./auth/login.js";

// handles login and redirect to page based on user role
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Show loading state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Logging in...";
      submitBtn.disabled = true;

      try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        await loginUser(auth, email, password);
      } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Check if user is already logged in
  // onAuthStateChanged(auth, async (user) => {
  //   if (user) {
  //     // User is signed in, redirect based on role
  //     try {
  //       const { doc, getDoc } = await import(
  //         "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"
  //       );
  //       const { db } = await import("./firebase/firebase-config.js");

  //       const userDoc = await getDoc(doc(db, "users", user.uid));
  //       if (userDoc.exists()) {
  //         const userData = userDoc.data();
  //         redirectByRole(userData.role);
  //       }
  //     } catch (error) {
  //       console.error("Error checking user role:", error);
  //     }
  //   }
  // });
});
