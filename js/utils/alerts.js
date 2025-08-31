/**
 * Shows a Bootstrap alert on the page. The alert is appended to the first element
 * with the id `alertContainer`. If no such element exists, this function does nothing.
 *
 * @param {string} message The content of the alert.
 * @param {string} [type="info"] The type of alert. One of "info", "success", "warning", "danger".
 * @param {number} [duration=3000] The duration of the alert in ms. If <= 0, the alert will persist until dismissed.
 */
export function showAlert(type, message, duration = 5000) {
  const alertContainer = document.getElementById("alertContainer");

  if (!alertContainer) {
    console.error("Alert container not found");
    return;
  }

  // Create alert element
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${getBootstrapAlertType(
    type
  )} alert-dismissible fade show`;
  alertDiv.role = "alert";

  // Set icon based on type
  const icon = getAlertIcon(type);

  alertDiv.innerHTML = `
    ${icon} ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  // Add to container
  alertContainer.appendChild(alertDiv);

  // Auto remove after duration
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, duration);

  // Scroll to top if alert is not visible
  setTimeout(() => {
    alertContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

function getBootstrapAlertType(type) {
  switch (type.toLowerCase()) {
    case "success":
      return "success";
    case "error":
    case "danger":
      return "danger";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "info";
  }
}

function getAlertIcon(type) {
  switch (type.toLowerCase()) {
    case "success":
      return '<i class="fas fa-check-circle"></i>';
    case "error":
    case "danger":
      return '<i class="fas fa-exclamation-circle"></i>';
    case "warning":
      return '<i class="fas fa-exclamation-triangle"></i>';
    case "info":
      return '<i class="fas fa-info-circle"></i>';
    default:
      return '<i class="fas fa-info-circle"></i>';
  }
}

export function clearAlerts() {
  const alertContainer = document.getElementById("alertContainer");
  if (alertContainer) {
    alertContainer.innerHTML = "";
  }
}

export function showLoadingAlert(message = "Loading...") {
  const alertContainer = document.getElementById("alertContainer");

  if (!alertContainer) return;

  const loadingDiv = document.createElement("div");
  loadingDiv.className = "alert alert-info alert-dismissible fade show";
  loadingDiv.id = "loadingAlert";
  loadingDiv.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="spinner-border spinner-border-sm me-2" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      ${message}
    </div>
  `;

  alertContainer.appendChild(loadingDiv);
}

export function hideLoadingAlert() {
  const loadingAlert = document.getElementById("loadingAlert");
  if (loadingAlert) {
    loadingAlert.remove();
  }
}
