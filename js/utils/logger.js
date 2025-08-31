export function logAction(action, userId = "anonymous") {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${userId}: ${action}`);
  // Future: log to Firestore if required
}