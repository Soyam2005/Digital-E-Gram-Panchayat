import { requireAuth, getCurrentUser, logoutUser } from "../auth/login.js";
import { db } from "../firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import {
  showAlert,
  showLoadingAlert,
  hideLoadingAlert,
} from "../utils/alerts.js";

// Global variables
let currentUser = null;
let services = [];
let applications = [];

// Initialize dashboard
document.addEventListener("DOMContentLoaded", async () => {
  // Check authentication
  if (!requireAuth("citizen")) {
    return;
  }

  currentUser = getCurrentUser();

  // Initialize UI
  initializeUI();

  // Load dashboard data
  await loadDashboardData();

  // Set up event listeners
  setupEventListeners();
});

function initializeUI() {
  // Set user name
  const userNameElements = document.querySelectorAll(
    "#userName, #welcomeUserName"
  );
  userNameElements.forEach((element) => {
    element.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  });

  // Set up navigation
  setupNavigation();
}

function setupNavigation() {
  // Navigation links
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const target = link.getAttribute("href").substring(1);
      showSection(target);

      // Update active state
      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });
  }
}

function setupEventListeners() {
  // Service search
  const searchBtn = document.getElementById("searchBtn");
  const serviceSearch = document.getElementById("serviceSearch");

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      searchServices(serviceSearch.value);
    });
  }

  if (serviceSearch) {
    serviceSearch.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        searchServices(serviceSearch.value);
      }
    });
  }

  // Application status filter
  const statusFilters = document.querySelectorAll('input[name="statusFilter"]');
  statusFilters.forEach((filter) => {
    filter.addEventListener("change", () => {
      filterApplications(filter.value);
    });
  });

  // Profile form
  const profileForm = document.getElementById("profileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }

  // Service application modal
  const submitApplicationBtn = document.getElementById("submitApplicationBtn");
  if (submitApplicationBtn) {
    submitApplicationBtn.addEventListener("click", handleServiceApplication);
  }
}

async function loadDashboardData() {
  showLoadingAlert("Loading dashboard data...");

  try {
    // Load services
    await loadServices();

    // Load applications
    await loadApplications();

    // Update dashboard stats
    updateDashboardStats();

    // Load recent applications
    loadRecentApplications();
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showAlert("error", "Failed to load dashboard data");
  } finally {
    hideLoadingAlert();
  }
}

async function loadServices() {
  try {
    const servicesRef = collection(db, "services");
    const q = query(servicesRef, where("isActive", "==", true));
    const querySnapshot = await getDocs(q);

    services = [];
    querySnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() });
    });

    // Update services count
    document.getElementById("availableServices").textContent = services.length;
  } catch (error) {
    console.error("Error loading services:", error);
    showAlert("error", "Failed to load services");
  }
}

async function loadApplications() {
  try {
    const applicationsRef = collection(db, "applications");
    const q = query(
      applicationsRef,
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    applications = [];
    querySnapshot.forEach((doc) => {
      applications.push({ id: doc.id, ...doc.data() });
    });
  } catch (error) {
    console.error("Error loading applications:", error);
    showAlert("error", "Failed to load applications");
  }
}

function updateDashboardStats() {
  const totalApplications = applications.length;
  const approvedApplications = applications.filter(
    (app) => app.status === "approved"
  ).length;
  const pendingApplications = applications.filter(
    (app) => app.status === "pending"
  ).length;

  document.getElementById("totalApplications").textContent = totalApplications;
  document.getElementById("approvedApplications").textContent =
    approvedApplications;
  document.getElementById("pendingApplications").textContent =
    pendingApplications;
}

function loadRecentApplications() {
  const recentList = document.getElementById("recentApplicationsList");
  const recentApplications = applications.slice(0, 5);

  if (recentApplications.length === 0) {
    recentList.innerHTML = '<p class="text-muted">No recent applications</p>';
    return;
  }

  recentList.innerHTML = recentApplications
    .map(
      (app) => `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div>
        <strong>${app.serviceName}</strong>
        <br>
        <small class="text-muted">${new Date(
          app.createdAt
        ).toLocaleDateString()}</small>
      </div>
      <span class="badge bg-${getStatusBadgeColor(app.status)}">${
        app.status
      }</span>
    </div>
  `
    )
    .join("");
}

function showSection(sectionName) {
  // Hide all sections
  const sections = document.querySelectorAll(".section");
  sections.forEach((section) => {
    section.style.display = "none";
  });

  // Show target section
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.style.display = "block";

    // Load section-specific data
    switch (sectionName) {
      case "services":
        displayServices();
        break;
      case "applications":
        displayApplications();
        break;
      case "profile":
        loadProfileData();
        break;
    }
  }
}

function displayServices() {
  const servicesList = document.getElementById("servicesList");

  if (services.length === 0) {
    servicesList.innerHTML =
      '<div class="col-12"><p class="text-muted text-center">No services available</p></div>';
    return;
  }

  servicesList.innerHTML = services
    .map(
      (service) => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${service.name}</h5>
          <p class="card-text">${service.description}</p>
          <div class="mb-3">
            <small class="text-muted">
              <strong>Category:</strong> ${service.category}<br>
              <strong>Processing Time:</strong> ${service.processingTime} days<br>
              <strong>Fee:</strong> ₹${service.fee}
            </small>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openServiceApplication('${service.id}', '${service.name}')">
            Apply Now
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function displayApplications() {
  const applicationsList = document.getElementById("applicationsList");

  if (applications.length === 0) {
    applicationsList.innerHTML =
      '<p class="text-muted text-center">No applications found</p>';
    return;
  }

  applicationsList.innerHTML = applications
    .map(
      (app) => `
    <div class="col-12 mb-3">
      <div class="card">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-8">
              <h6 class="card-title">${app.serviceName}</h6>
              <p class="card-text">
                <small class="text-muted">
                  Applied on: ${new Date(
                    app.createdAt
                  ).toLocaleDateString()}<br>
                  Reason: ${app.reason}
                </small>
              </p>
            </div>
            <div class="col-md-4 text-end">
              <span class="badge bg-${getStatusBadgeColor(app.status)} mb-2">${
        app.status
      }</span>
              <br>
              <button class="btn btn-outline-primary btn-sm" onclick="viewApplicationDetails('${
                app.id
              }')">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function searchServices(searchTerm) {
  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  displayFilteredServices(filteredServices);
}

function displayFilteredServices(filteredServices) {
  const servicesList = document.getElementById("servicesList");

  if (filteredServices.length === 0) {
    servicesList.innerHTML =
      '<div class="col-12"><p class="text-muted text-center">No services found matching your search</p></div>';
    return;
  }

  servicesList.innerHTML = filteredServices
    .map(
      (service) => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${service.name}</h5>
          <p class="card-text">${service.description}</p>
          <div class="mb-3">
            <small class="text-muted">
              <strong>Category:</strong> ${service.category}<br>
              <strong>Processing Time:</strong> ${service.processingTime} days<br>
              <strong>Fee:</strong> ₹${service.fee}
            </small>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openServiceApplication('${service.id}', '${service.name}')">
            Apply Now
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function filterApplications(status) {
  const filteredApplications =
    status === "all"
      ? applications
      : applications.filter((app) => app.status === status);

  displayFilteredApplications(filteredApplications);
}

function displayFilteredApplications(filteredApplications) {
  const applicationsList = document.getElementById("applicationsList");

  if (filteredApplications.length === 0) {
    applicationsList.innerHTML =
      '<p class="text-muted text-center">No applications found</p>';
    return;
  }

  applicationsList.innerHTML = filteredApplications
    .map(
      (app) => `
    <div class="col-12 mb-3">
      <div class="card">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-8">
              <h6 class="card-title">${app.serviceName}</h6>
              <p class="card-text">
                <small class="text-muted">
                  Applied on: ${new Date(
                    app.createdAt
                  ).toLocaleDateString()}<br>
                  Reason: ${app.reason}
                </small>
              </p>
            </div>
            <div class="col-md-4 text-end">
              <span class="badge bg-${getStatusBadgeColor(app.status)} mb-2">${
        app.status
      }</span>
              <br>
              <button class="btn btn-outline-primary btn-sm" onclick="viewApplicationDetails('${
                app.id
              }')">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function loadProfileData() {
  // Populate profile form
  document.getElementById("profileFirstName").value =
    currentUser.firstName || "";
  document.getElementById("profileLastName").value = currentUser.lastName || "";
  document.getElementById("profileEmail").value = currentUser.email || "";
  document.getElementById("profilePhone").value = currentUser.phone || "";
  document.getElementById("profileVillage").value = currentUser.village || "";
  document.getElementById("profileDistrict").value = currentUser.district || "";
  document.getElementById("profileState").value = currentUser.state || "";
  document.getElementById("profilePincode").value = currentUser.pincode || "";
  document.getElementById("profileAddress").value = currentUser.address || "";
  document.getElementById("profileAadhar").value = currentUser.aadhar || "";

  // Set account info
  document.getElementById("profileUserId").textContent = currentUser.uid;
  document.getElementById("profileRole").textContent = currentUser.role;
  document.getElementById("profileMemberSince").textContent = new Date(
    currentUser.createdAt
  ).toLocaleDateString();
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const updatedData = {
    firstName: document.getElementById("profileFirstName").value.trim(),
    lastName: document.getElementById("profileLastName").value.trim(),
    phone: document.getElementById("profilePhone").value.trim(),
    village: document.getElementById("profileVillage").value.trim(),
    district: document.getElementById("profileDistrict").value.trim(),
    state: document.getElementById("profileState").value.trim(),
    pincode: document.getElementById("profilePincode").value.trim(),
    address: document.getElementById("profileAddress").value.trim(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, "users", currentUser.uid), updatedData);

    // Update current user data
    Object.assign(currentUser, updatedData);
    sessionStorage.setItem("user", JSON.stringify(currentUser));

    showAlert("success", "Profile updated successfully");
  } catch (error) {
    console.error("Error updating profile:", error);
    showAlert("error", "Failed to update profile");
  }
}

// Global functions for onclick handlers
window.openServiceApplication = function (serviceId, serviceName) {
  document.getElementById("selectedServiceId").value = serviceId;
  document.getElementById("selectedServiceName").value = serviceName;
  document.getElementById("modalServiceName").value = serviceName;

  // Get service details for required documents
  const service = services.find((s) => s.id === serviceId);
  if (service && service.requiredDocuments) {
    const documentsList = service.requiredDocuments
      .split(",")
      .map((doc) => `<li>${doc.trim()}</li>`)
      .join("");
    document.getElementById(
      "requiredDocuments"
    ).innerHTML = `<ul>${documentsList}</ul>`;
  } else {
    document.getElementById("requiredDocuments").innerHTML =
      '<p class="text-muted">No specific documents required</p>';
  }

  // Show modal
  const modal = new bootstrap.Modal(
    document.getElementById("serviceApplicationModal")
  );
  modal.show();
};

window.viewApplicationDetails = function (applicationId) {
  const application = applications.find((app) => app.id === applicationId);
  if (application) {
    const detailsContainer = document.getElementById("applicationDetails");

    // Format dates
    const appliedDate = new Date(application.createdAt).toLocaleDateString();
    const updatedDate = application.updatedAt
      ? new Date(application.updatedAt).toLocaleDateString()
      : "Not updated";

    detailsContainer.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <h6 class="text-primary">Application Information</h6>
          <p><strong>Application ID:</strong> ${application.id}</p>
          <p><strong>Service:</strong> ${application.serviceName}</p>
          <p><strong>Status:</strong> <span class="badge bg-${getStatusBadgeColor(
            application.status
          )}">${application.status}</span></p>
          <p><strong>Applied on:</strong> ${appliedDate}</p>
          <p><strong>Last updated:</strong> ${updatedDate}</p>
        </div>
        <div class="col-md-6">
          <h6 class="text-primary">Application Details</h6>
          <p><strong>Reason:</strong> ${application.reason}</p>
          <p><strong>Notes:</strong> ${application.notes || "None"}</p>
          <p><strong>Comments:</strong> ${application.comments || "None"}</p>
        </div>
      </div>
      
      <hr />
      
      <div class="row">
        <div class="col-md-6">
          <h6 class="text-primary">Applicant Information</h6>
          <p><strong>Name:</strong> ${
            application.applicantName ||
            `${currentUser.firstName} ${currentUser.lastName}`
          }</p>
          <p><strong>Phone:</strong> ${
            application.applicantPhone || currentUser.phone || "Not provided"
          }</p>
          <p><strong>Village:</strong> ${
            application.applicantVillage ||
            currentUser.village ||
            "Not provided"
          }</p>
        </div>
        <div class="col-md-6">
          <h6 class="text-primary">Processing Information</h6>
          <p><strong>Processed by:</strong> ${
            application.processedBy || "Not yet processed"
          }</p>
          <p><strong>Processed on:</strong> ${
            application.processedAt
              ? new Date(application.processedAt).toLocaleDateString()
              : "Not yet processed"
          }</p>
          <p><strong>Processing role:</strong> ${
            application.processedByRole || "Not yet processed"
          }</p>
        </div>
      </div>
    `;

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("applicationDetailsModal")
    );
    modal.show();
  }
};

async function handleServiceApplication() {
  const serviceId = document.getElementById("selectedServiceId").value;
  const serviceName = document.getElementById("selectedServiceName").value;
  const reason = document.getElementById("applicationReason").value.trim();
  const notes = document.getElementById("applicationNotes").value.trim();

  if (!reason) {
    showAlert("error", "Please provide a reason for your application");
    return;
  }

  try {
    const applicationData = {
      userId: currentUser.uid,
      serviceId: serviceId,
      serviceName: serviceName,
      reason: reason,
      notes: notes,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add applicant details
      applicantId: currentUser.uid,
      applicantName: `${currentUser.firstName} ${currentUser.lastName}`,
      applicantPhone: currentUser.phone || "",
      applicantVillage: currentUser.village || "",
      applicantDistrict: currentUser.district || "",
      applicantState: currentUser.state || "",
      applicantPincode: currentUser.pincode || "",
      applicantAddress: currentUser.address || "",
    };

    await addDoc(collection(db, "applications"), applicationData);

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("serviceApplicationModal")
    );
    modal.hide();

    // Reset form
    document.getElementById("serviceApplicationForm").reset();

    // Reload applications
    await loadApplications();
    updateDashboardStats();
    loadRecentApplications();

    showAlert("success", "Application submitted successfully");
  } catch (error) {
    console.error("Error submitting application:", error);
    showAlert("error", "Failed to submit application");
  }
}

function getStatusBadgeColor(status) {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "secondary";
  }
}
