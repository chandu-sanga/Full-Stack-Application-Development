document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
      const res = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password })
      });
      const data = await res.json();
      if (data.status === 'success' && data.user.role === 'admin') {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userRole", data.user.role);
        window.location.href = 'admin.html';
      } else if (data.status === 'success') {
        showToast("Access Denied", "This portal is for admins only.", "warning");
      } else {
        showToast("Login Failed", data.message, "error");
      }
    } catch (error) {
      showToast("Error", "Server connection failed.", "error");
    }
  });
});

function showToast(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
