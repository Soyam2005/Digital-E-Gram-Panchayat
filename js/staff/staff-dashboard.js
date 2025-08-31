import { requireAuth, getCurrentUser, logoutUser } from "../auth/login.js";
import { db } from "../firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
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
  if (!requireAuth("staff")) {
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

  // Application status update
  const updateStatusBtn = document.getElementById("updateStatusBtn");
  if (updateStatusBtn) {
    updateStatusBtn.addEventListener("click", handleUpdateApplicationStatus);
  }

  // Application status filter
  const statusFilters = document.querySelectorAll('input[name="statusFilter"]');
  statusFilters.forEach((filter) => {
    filter.addEventListener("change", () => {
      filterApplications(filter.value);
    });
  });
}

async function loadDashboardData() {
  showLoadingAlert("Loading dashboard data...");

  try {
    // Load services
    await loadServices();

    // Load applications
    await loadApplications();

    // Preload profile data
    loadProfileData();

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
    const q = query(applicationsRef, orderBy("createdAt", "desc"));
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
  const pendingApplications = applications.filter(
    (app) => app.status === "pending"
  ).length;
  const processedToday = applications.filter((app) => {
    const today = new Date().toDateString();
    const appDate = new Date(app.updatedAt).toDateString();
    return appDate === today && app.status !== "pending";
  }).length;

  document.getElementById("pendingApplications").textContent =
    pendingApplications;
  document.getElementById("processedToday").textContent = processedToday;
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
  console.log("Showing section:", sectionName);
  
  // Hide all sections
  const sections = document.querySelectorAll(".section");
  sections.forEach((section) => {
    section.style.display = "none";
  });

  // Show target section
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.style.display = "block";
    console.log("Section displayed:", sectionName);

    // Load section-specific data
    switch (sectionName) {
      case "services":
        displayServices();
        break;
      case "applications":
        displayApplications();
        break;
      case "profile":
        console.log("Loading profile data...");
        loadProfileData();
        break;
    }
  } else {
    console.error("Target section not found:", sectionName);
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
          <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">
            View Details
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
                  Reason: ${app.reason}<br>
                  <strong>Applicant:</strong> ${app.applicantName || "Not provided"}<br>
                  <strong>Phone:</strong> ${app.applicantPhone || "Not provided"}<br>
                  <strong>Village:</strong> ${app.applicantVillage || "Not provided"}
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
          <button class="btn btn-info btn-sm" onclick="viewServiceDetails('${service.id}')">
            View Details
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
                  Reason: ${app.reason}<br>
                  <strong>Applicant:</strong> ${app.applicantName || "Not provided"}<br>
                  <strong>Phone:</strong> ${app.applicantPhone || "Not provided"}<br>
                  <strong>Village:</strong> ${app.applicantVillage || "Not provided"}
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
  try {
    console.log("Loading profile data for user:", currentUser);
    
    // Check if currentUser exists
    if (!currentUser) {
      console.error("currentUser is null or undefined");
      return;
    }

    // Populate profile form (read-only for staff)
    const profileFirstName = document.getElementById("profileFirstName");
    const profileLastName = document.getElementById("profileLastName");
    const profileEmail = document.getElementById("profileEmail");
    const profilePhone = document.getElementById("profilePhone");
    const profileVillage = document.getElementById("profileVillage");
    const profileDistrict = document.getElementById("profileDistrict");
    const profileState = document.getElementById("profileState");
    const profilePincode = document.getElementById("profilePincode");
    const profileAddress = document.getElementById("profileAddress");
    const profileAadhar = document.getElementById("profileAadhar");

    // Check if all elements exist
    if (!profileFirstName || !profileLastName || !profileEmail || !profilePhone || 
        !profileVillage || !profileDistrict || !profileState || !profilePincode || 
        !profileAddress || !profileAadhar) {
      console.error("Some profile form elements are missing, using fallback display");
      displayFallbackProfile();
      return;
    }

    // Populate form fields
    profileFirstName.value = currentUser.firstName || "";
    profileLastName.value = currentUser.lastName || "";
    profileEmail.value = currentUser.email || "";
    profilePhone.value = currentUser.phone || "";
    profileVillage.value = currentUser.village || "";
    profileDistrict.value = currentUser.district || "";
    profileState.value = currentUser.state || "";
    profilePincode.value = currentUser.pincode || "";
    profileAddress.value = currentUser.address || "";
    profileAadhar.value = currentUser.aadhar || "";

    // Set account info
    const profileUserId = document.getElementById("profileUserId");
    const profileRole = document.getElementById("profileRole");
    const profileMemberSince = document.getElementById("profileMemberSince");

    if (profileUserId && profileRole && profileMemberSince) {
      profileUserId.textContent = currentUser.uid;
      profileRole.textContent = currentUser.role;
      profileMemberSince.textContent = currentUser.createdAt 
        ? new Date(currentUser.createdAt).toLocaleDateString()
        : "Not available";
    }

    console.log("Profile data loaded successfully");
  } catch (error) {
    console.error("Error loading profile data:", error);
    displayFallbackProfile();
  }
}

function displayFallbackProfile() {
  console.log("Displaying fallback profile");
  const profileSection = document.getElementById("profile");
  if (profileSection) {
    const profileContent = profileSection.querySelector(".card-body");
    if (profileContent) {
      profileContent.innerHTML = `
        <div class="row">
          <div class="col-md-8">
            <h5>Profile Information (Read-Only)</h5>
            <p><strong>Name:</strong> ${currentUser.firstName || ""} ${currentUser.lastName || ""}</p>
            <p><strong>Email:</strong> ${currentUser.email || "Not provided"}</p>
            <p><strong>Phone:</strong> ${currentUser.phone || "Not provided"}</p>
            <p><strong>Village:</strong> ${currentUser.village || "Not provided"}</p>
            <p><strong>District:</strong> ${currentUser.district || "Not provided"}</p>
            <p><strong>State:</strong> ${currentUser.state || "Not provided"}</p>
            <p><strong>Pincode:</strong> ${currentUser.pincode || "Not provided"}</p>
            <p><strong>Address:</strong> ${currentUser.address || "Not provided"}</p>
            <p><strong>Aadhar:</strong> ${currentUser.aadhar || "Not provided"}</p>
          </div>
          <div class="col-md-4">
            <div class="card">
              <div class="card-body">
                <h5 class="card-title">Account Information</h5>
                <p><strong>User ID:</strong> <small class="text-muted">${currentUser.uid}</small></p>
                <p><strong>Role:</strong> <span class="badge bg-primary">${currentUser.role}</span></p>
                <p><strong>Member Since:</strong> ${currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "Not available"}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
}

async function handleUpdateApplicationStatus() {
  const applicationId = document
    .getElementById("applicationDetailsModal")
    .getAttribute("data-application-id");
  const newStatus = document.getElementById("statusUpdate").value;
  const comments = document.getElementById("statusComments").value.trim();

  try {
    const updateData = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      // Add processing details
      processedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      processedByRole: currentUser.role,
      processedAt: new Date().toISOString(),
    };

    if (comments) {
      updateData.comments = comments;
    }

    await updateDoc(doc(db, "applications", applicationId), updateData);

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("applicationDetailsModal")
    );
    modal.hide();

    // Reload applications
    await loadApplications();
    displayApplications();
    loadRecentApplications();
    updateDashboardStats();

    showAlert("success", "Application status updated successfully");
  } catch (error) {
    console.error("Error updating application status:", error);
    showAlert("error", "Failed to update application status");
  }
}

// Global functions for onclick handlers
window.viewServiceDetails = function (serviceId) {
  const service = services.find((s) => s.id === serviceId);
  if (service) {
    const detailsContainer = document.getElementById("serviceDetails");
    detailsContainer.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <p><strong>Service Name:</strong> ${service.name}</p>
          <p><strong>Category:</strong> ${service.category}</p>
          <p><strong>Processing Time:</strong> ${
            service.processingTime
          } days</p>
          <p><strong>Fee:</strong> ₹${service.fee}</p>
        </div>
        <div class="col-md-6">
          <p><strong>Description:</strong></p>
          <p>${service.description}</p>
          ${
            service.requiredDocuments
              ? `<p><strong>Required Documents:</strong> ${service.requiredDocuments}</p>`
              : ""
          }
          ${
            service.eligibilityCriteria
              ? `<p><strong>Eligibility Criteria:</strong> ${service.eligibilityCriteria}</p>`
              : ""
          }
        </div>
      </div>
    `;

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("serviceDetailsModal")
    );
    modal.show();
  }
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
    const processedDate = application.processedAt
      ? new Date(application.processedAt).toLocaleDateString()
      : "Not yet processed";

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
            application.applicantName || "Not provided"
          }</p>
          <p><strong>Phone:</strong> ${
            application.applicantPhone || "Not provided"
          }</p>
          <p><strong>Village:</strong> ${
            application.applicantVillage || "Not provided"
          }</p>
          <p><strong>District:</strong> ${
            application.applicantDistrict || "Not provided"
          }</p>
        </div>
        <div class="col-md-6">
          <h6 class="text-primary">Processing Information</h6>
          <p><strong>Processed by:</strong> ${
            application.processedBy || "Not yet processed"
          }</p>
          <p><strong>Processed on:</strong> ${processedDate}</p>
          <p><strong>Processing role:</strong> ${
            application.processedByRole || "Not yet processed"
          }</p>
        </div>
      </div>
    `;

    // Set current status
    document.getElementById("statusUpdate").value = application.status;
    document.getElementById("statusComments").value =
      application.comments || "";

    // Store application ID for update
    document
      .getElementById("applicationDetailsModal")
      .setAttribute("data-application-id", application.id);

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("applicationDetailsModal")
    );
    modal.show();
  }
};

// Global functions for quick actions
window.showSection = function (sectionName) {
  showSection(sectionName);
};

window.showPendingApplications = function () {
  showSection("applications");
  // Trigger pending filter
  document.getElementById("pendingStatus").checked = true;
  filterApplications("pending");
};

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
