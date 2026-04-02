document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fullname = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', fullname, email, username, password })
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast("Success", "Account created! Redirecting to login...", "success");
        setTimeout(() => {
          window.location.href = 'user_login.html';
        }, 2000);
      } else {
        showToast("Registration Failed", data.message, "error");
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
