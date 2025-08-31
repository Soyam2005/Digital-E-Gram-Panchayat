import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { auth, db } from "../firebase/firebase-config.js";
import { showAlert } from "../utils/alerts.js";

export async function registerUser(userData) {
  try {
    // Create user account in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    const user = userCredential.user;

    // Prepare user profile data (remove password)
    const { password, confirmPassword, terms, ...profileData } = userData;

    // Add creation timestamp
    profileData.createdAt = new Date().toISOString();
    profileData.updatedAt = new Date().toISOString();

    // Save user profile to Firestore
    await setDoc(doc(db, "users", user.uid), profileData);

    showAlert("success", "Registration successful! Please login.");

    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (error) {
    console.error("Registration error:", error);

    switch (error.code) {
      case "auth/email-already-in-use":
        showAlert("error", "An account with this email already exists.");
        break;
      case "auth/invalid-email":
        showAlert("error", "Invalid email address format.");
        break;
      case "auth/weak-password":
        showAlert("error", "Password should be at least 6 characters long.");
        break;
      case "auth/operation-not-allowed":
        showAlert(
          "error",
          "Registration is currently disabled. Please contact administrator."
        );
        break;
      default:
        showAlert("error", "Registration failed. Please try again.");
    }
  }
}

// Form validation functions
export function validateRegistrationForm(formData) {
  const errors = [];

  // Required fields validation
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "password",
    "confirmPassword",
    "village",
    "district",
    "state",
    "pincode",
    "address",
    "aadhar",
    "role",
  ];

  requiredFields.forEach((field) => {
    if (!formData[field] || formData[field].trim() === "") {
      errors.push(
        `${field.charAt(0).toUpperCase() + field.slice(1)} is required.`
      );
    }
  });

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (formData.email && !emailRegex.test(formData.email)) {
    errors.push("Please enter a valid email address.");
  }

  // Phone validation
  const phoneRegex = /^[0-9]{10}$/;
  if (formData.phone && !phoneRegex.test(formData.phone)) {
    errors.push("Please enter a valid 10-digit phone number.");
  }

  // Password validation
  if (formData.password && formData.password.length < 6) {
    errors.push("Password must be at least 6 characters long.");
  }

  // Password confirmation
  if (
    formData.password &&
    formData.confirmPassword &&
    formData.password !== formData.confirmPassword
  ) {
    errors.push("Passwords do not match.");
  }

  // Aadhar validation
  const aadharRegex = /^[0-9]{12}$/;
  if (formData.aadhar && !aadharRegex.test(formData.aadhar)) {
    errors.push("Please enter a valid 12-digit Aadhar number.");
  }

  // Pincode validation
  const pincodeRegex = /^[0-9]{6}$/;
  if (formData.pincode && !pincodeRegex.test(formData.pincode)) {
    errors.push("Please enter a valid 6-digit pincode.");
  }

  // Terms acceptance
  if (!formData.terms) {
    errors.push("You must accept the terms and conditions.");
  }

  return errors;
}

// Initialize registration form
export function initRegistrationForm() {
  const form = document.getElementById("registerForm");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      // Collect form data
      const formData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        password: document.getElementById("password").value,
        confirmPassword: document.getElementById("confirmPassword").value,
        village: document.getElementById("village").value.trim(),
        district: document.getElementById("district").value.trim(),
        state: document.getElementById("state").value.trim(),
        pincode: document.getElementById("pincode").value.trim(),
        address: document.getElementById("address").value.trim(),
        aadhar: document.getElementById("aadhar").value.trim(),
        role: document.getElementById("role").value,
        terms: document.getElementById("terms").checked,
      };

      console.log(formData);

      // Validate form data
      const errors = validateRegistrationForm(formData);

      if (errors.length > 0) {
        errors.forEach((error) => {
          showAlert("error", error);
        });
        return;
      }

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Registering...";
      submitBtn.disabled = true;

      try {
        await registerUser(formData);
      } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initRegistrationForm();
});
