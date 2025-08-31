import { requireAuth, getCurrentUser, logoutUser } from "../auth/login.js";
import { db } from "../firebase/firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
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
  if (!requireAuth("officer")) {
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
  // Service management
  const saveServiceBtn = document.getElementById("saveServiceBtn");
  const updateServiceBtn = document.getElementById("updateServiceBtn");
  const deleteServiceBtn = document.getElementById("deleteServiceBtn");

  if (saveServiceBtn) {
    saveServiceBtn.addEventListener("click", handleAddService);
  }

  if (updateServiceBtn) {
    updateServiceBtn.addEventListener("click", handleUpdateService);
  }

  if (deleteServiceBtn) {
    deleteServiceBtn.addEventListener("click", handleDeleteService);
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
    loadRecentActivities();
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
    const q = query(servicesRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    services = [];
    querySnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() });
    });

    // Update services count
    document.getElementById("totalServices").textContent = services.length;
    document.getElementById("activeServices").textContent = services.filter(
      (s) => s.isActive
    ).length;
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
  const totalApplications = applications.length;
  const pendingApplications = applications.filter(
    (app) => app.status === "pending"
  ).length;

  document.getElementById("totalApplications").textContent = totalApplications;
  document.getElementById("pendingApplications").textContent =
    pendingApplications;
}

function loadRecentActivities() {
  // Recent applications
  const recentApplicationsList = document.getElementById(
    "recentApplicationsList"
  );
  const recentApplications = applications.slice(0, 5);

  if (recentApplications.length === 0) {
    recentApplicationsList.innerHTML =
      '<p class="text-muted">No recent applications</p>';
  } else {
    recentApplicationsList.innerHTML = recentApplications
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

  // Recent services
  const recentServicesList = document.getElementById("recentServicesList");
  const recentServices = services.slice(0, 5);

  if (recentServices.length === 0) {
    recentServicesList.innerHTML =
      '<p class="text-muted">No recent services</p>';
  } else {
    recentServicesList.innerHTML = recentServices
      .map(
        (service) => `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div>
          <strong>${service.name}</strong>
          <br>
          <small class="text-muted">${service.category}</small>
        </div>
        <span class="badge bg-${service.isActive ? "success" : "secondary"}">${
          service.isActive ? "Active" : "Inactive"
        }</span>
      </div>
    `
      )
      .join("");
  }
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
      case "reports":
        loadReports();
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
      '<p class="text-muted text-center">No services available</p>';
    return;
  }

  servicesList.innerHTML = services
    .map(
      (service) => `
    <div class="col-12 mb-3">
      <div class="card">
        <div class="card-body">
          <div class="row align-items-center">
            <div class="col-md-8">
              <h6 class="card-title">${service.name}</h6>
              <p class="card-text">${service.description}</p>
              <small class="text-muted">
                <strong>Category:</strong> ${service.category} | 
                <strong>Processing Time:</strong> ${
                  service.processingTime
                } days | 
                <strong>Fee:</strong> ₹${service.fee}
              </small>
            </div>
            <div class="col-md-4 text-end">
              <span class="badge bg-${
                service.isActive ? "success" : "secondary"
              } mb-2">${service.isActive ? "Active" : "Inactive"}</span>
              <br>
              <button class="btn btn-outline-primary btn-sm me-2" onclick="editService('${
                service.id
              }')">
                Edit
              </button>
              <button class="btn btn-outline-danger btn-sm" onclick="deleteService('${
                service.id
              }')">
                Delete
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

async function handleAddService() {
  const formData = {
    name: document.getElementById("serviceName").value.trim(),
    category: document.getElementById("serviceCategory").value,
    description: document.getElementById("serviceDescription").value.trim(),
    processingTime: parseInt(document.getElementById("processingTime").value),
    fee: parseFloat(document.getElementById("serviceFee").value),
    requiredDocuments: document
      .getElementById("requiredDocuments")
      .value.trim(),
    eligibilityCriteria: document
      .getElementById("eligibilityCriteria")
      .value.trim(),
    isActive: document.getElementById("isActive").checked,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Validation
  if (
    !formData.name ||
    !formData.category ||
    !formData.description ||
    !formData.processingTime ||
    formData.fee < 0
  ) {
    showAlert("error", "Please fill in all required fields");
    return;
  }

  try {
    await addDoc(collection(db, "services"), formData);

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addServiceModal")
    );
    modal.hide();

    // Reset form
    document.getElementById("addServiceForm").reset();

    // Reload services
    await loadServices();
    displayServices();
    loadRecentActivities();

    showAlert("success", "Service added successfully");
  } catch (error) {
    console.error("Error adding service:", error);
    showAlert("error", "Failed to add service");
  }
}

async function handleUpdateService() {
  const serviceId = document.getElementById("editServiceId").value;
  const formData = {
    name: document.getElementById("editServiceName").value.trim(),
    category: document.getElementById("editServiceCategory").value,
    description: document.getElementById("editServiceDescription").value.trim(),
    processingTime: parseInt(
      document.getElementById("editProcessingTime").value
    ),
    fee: parseFloat(document.getElementById("editServiceFee").value),
    requiredDocuments: document
      .getElementById("editRequiredDocuments")
      .value.trim(),
    eligibilityCriteria: document
      .getElementById("editEligibilityCriteria")
      .value.trim(),
    isActive: document.getElementById("editIsActive").checked,
    updatedAt: new Date().toISOString(),
  };

  // Validation
  if (
    !formData.name ||
    !formData.category ||
    !formData.description ||
    !formData.processingTime ||
    formData.fee < 0
  ) {
    showAlert("error", "Please fill in all required fields");
    return;
  }

  try {
    await updateDoc(doc(db, "services", serviceId), formData);

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("editServiceModal")
    );
    modal.hide();

    // Reload services
    await loadServices();
    displayServices();
    loadRecentActivities();

    showAlert("success", "Service updated successfully");
  } catch (error) {
    console.error("Error updating service:", error);
    showAlert("error", "Failed to update service");
  }
}

async function handleDeleteService() {
  const serviceId = document.getElementById("editServiceId").value;

  if (
    !confirm(
      "Are you sure you want to delete this service? This action cannot be undone."
    )
  ) {
    return;
  }

  try {
    await deleteDoc(doc(db, "services", serviceId));

    // Close modal
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("editServiceModal")
    );
    modal.hide();

    // Reload services
    await loadServices();
    displayServices();
    loadRecentActivities();

    showAlert("success", "Service deleted successfully");
  } catch (error) {
    console.error("Error deleting service:", error);
    showAlert("error", "Failed to delete service");
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
    loadRecentActivities();
    updateDashboardStats();

    showAlert("success", "Application status updated successfully");
  } catch (error) {
    console.error("Error updating application status:", error);
    showAlert("error", "Failed to update application status");
  }
}

function loadReports() {
  // This would typically load charts and analytics
  // For now, we'll just show a placeholder
  showAlert("info", "Reports and analytics will be implemented here");
}

// Global functions for onclick handlers
window.editService = function (serviceId) {
  const service = services.find((s) => s.id === serviceId);
  if (service) {
    document.getElementById("editServiceId").value = service.id;
    document.getElementById("editServiceName").value = service.name;
    document.getElementById("editServiceCategory").value = service.category;
    document.getElementById("editServiceDescription").value =
      service.description;
    document.getElementById("editProcessingTime").value =
      service.processingTime;
    document.getElementById("editServiceFee").value = service.fee;
    document.getElementById("editRequiredDocuments").value =
      service.requiredDocuments || "";
    document.getElementById("editEligibilityCriteria").value =
      service.eligibilityCriteria || "";
    document.getElementById("editIsActive").checked = service.isActive;

    // Show modal
    const modal = new bootstrap.Modal(
      document.getElementById("editServiceModal")
    );
    modal.show();
  }
};

window.deleteService = function (serviceId) {
  if (
    confirm(
      "Are you sure you want to delete this service? This action cannot be undone."
    )
  ) {
    deleteDoc(doc(db, "services", serviceId))
      .then(() => {
        loadServices();
        displayServices();
        loadRecentActivities();
        showAlert("success", "Service deleted successfully");
      })
      .catch((error) => {
        console.error("Error deleting service:", error);
        showAlert("error", "Failed to delete service");
      });
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
function loadProfileData() {
  try {
    console.log("Loading profile data for user:", currentUser);
    
    // Check if currentUser exists
    if (!currentUser) {
      console.error("currentUser is null or undefined");
      return;
    }

    const profileInfo = document.getElementById("profileInfo");
    const accountInfo = document.getElementById("accountInfo");

    if (profileInfo) {
      profileInfo.innerHTML = `
        <div class="row">
          <div class="col-md-6">
            <p><strong>First Name:</strong> ${
              currentUser.firstName || "Not provided"
            }</p>
            <p><strong>Last Name:</strong> ${
              currentUser.lastName || "Not provided"
            }</p>
            <p><strong>Phone:</strong> ${currentUser.phone || "Not provided"}</p>
            <p><strong>Email:</strong> ${currentUser.email || "Not provided"}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Village:</strong> ${
              currentUser.village || "Not provided"
            }</p>
            <p><strong>District:</strong> ${
              currentUser.district || "Not provided"
            }</p>
            <p><strong>State:</strong> ${currentUser.state || "Not provided"}</p>
            <p><strong>Pincode:</strong> ${
              currentUser.pincode || "Not provided"
            }</p>
          </div>
        </div>
        <div class="row mt-3">
          <div class="col-12">
            <p><strong>Complete Address:</strong></p>
            <p class="text-muted">${currentUser.address || "Not provided"}</p>
          </div>
        </div>
      `;
    } else {
      console.error("profileInfo element not found, using fallback display");
      displayFallbackProfile();
      return;
    }

    if (accountInfo) {
      accountInfo.innerHTML = `
        <p><strong>User ID:</strong> <small class="text-muted">${
          currentUser.uid
        }</small></p>
        <p><strong>Role:</strong> <span class="badge bg-primary">${
          currentUser.role
        }</span></p>
        <p><strong>Account Created:</strong> ${
          currentUser.createdAt
            ? new Date(currentUser.createdAt).toLocaleDateString()
            : "Not available"
        }</p>
        <p><strong>Last Updated:</strong> ${
          currentUser.updatedAt
            ? new Date(currentUser.updatedAt).toLocaleDateString()
            : "Not available"
        }</p>
      `;
    } else {
      console.error("accountInfo element not found");
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
            <h5>Profile Information</h5>
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
                <p><strong>Account Created:</strong> ${currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "Not available"}</p>
                <p><strong>Last Updated:</strong> ${currentUser.updatedAt ? new Date(currentUser.updatedAt).toLocaleDateString() : "Not available"}</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }
}

