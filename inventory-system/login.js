document.addEventListener("DOMContentLoaded", () => {
    // Check theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
    }

    const loginForm = document.getElementById("loginForm");
    
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;
        
        try {
            const res = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'login',
                    username: username,
                    password: password
                })
            });
            
            const data = await res.json();
            
            if (data.status === 'success') {
                showToast("Success", "Welcome back, " + data.user.username + "!", "success");
                
                // Store session (simplified for XAMPP demo)
                sessionStorage.setItem("isLoggedIn", "true");
                sessionStorage.setItem("userRole", data.user.role);
                sessionStorage.setItem("username", data.user.username);
                
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1000);
            } else {
                showToast("Login Failed", data.message, "error");
            }
        } catch (error) {
            console.error("Auth error:", error);
            showToast("Connection Error", "Could not reach the authentication server.", "error");
        }
    });
});

function showToast(title, message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const icons = { success: "ph-check-circle", error: "ph-warning-circle", warning: "ph-warning", info: "ph-info" };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="ph ${icons[type]} toast-icon"></i>
      <div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div>
      <div class="toast-progress"></div>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add("hiding"); toast.addEventListener("animationend", () => toast.remove()); }, 3000);
}
