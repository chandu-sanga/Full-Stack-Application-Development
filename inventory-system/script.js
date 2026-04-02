let products = [];
let barChart = null;
let pieChart = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 8;
const LOW_STOCK_THRESHOLD = 5;

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }

  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  const landingView = document.getElementById("landingView");
  const dashboardView = document.getElementById("dashboardView");

  if (!isLoggedIn) {
    if (landingView) landingView.style.display = "block";
    if (dashboardView) dashboardView.style.display = "none";
  } else {
    if (landingView) landingView.style.display = "none";
    if (dashboardView) dashboardView.style.display = "block";
    fetchProducts();
  }
});

function logout() {
  sessionStorage.clear();
  window.location.reload();
}

async function fetchProducts() {
  try {
    const res = await fetch('api.php');
    if (!res.ok) throw new Error("Network response was not ok");

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const parsed = await res.json();
      products = Array.isArray(parsed) ? parsed : [];
    } else {
      console.warn("API not reachable or not running in XAMPP. Using empty array.");
      products = [];
    }

    updateFilterOptions();
    render();
  } catch (error) {
    console.error("Fetch error: ", error);
    showToast("Connection Error", "Ensure this is running via XAMPP (http://localhost/...).", "error");
  }
}

/* =========================================
   UI & RENDERING
   ========================================= */
function updateFilterOptions() {
  const categories = [...new Set(products.map(p => p.category))].sort();
  const filter = document.getElementById("catFilter");
  if (!filter) return;
  const currentVal = filter.value;
  filter.innerHTML = `<option value="">All Categories</option>` +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');
  filter.value = currentVal;
}

function render(pageOffset = 0) {
  const searchEl = document.getElementById("search");
  const sortEl = document.getElementById("sort");
  const filterEl = document.getElementById("catFilter");

  const searchVal = searchEl ? searchEl.value.toLowerCase() : "";
  const sortVal = sortEl ? sortEl.value : "";
  const filterVal = filterEl ? filterEl.value : "";

  let data = products.filter(x => {
    const matchSearch = x.name.toLowerCase().includes(searchVal) || x.category.toLowerCase().includes(searchVal);
    const matchCategory = filterVal ? x.category === filterVal : true;
    return matchSearch && matchCategory;
  });

  if (sortVal) {
    data.sort((a, b) => {
      if (sortVal === "name") return a.name.localeCompare(b.name);
      return a[sortVal] < b[sortVal] ? 1 : -1;
    });
  }

  const totalValue = data.reduce((sum, p) => sum + (p.price * p.stock), 0);
  const lowStockCount = data.filter(p => p.stock < LOW_STOCK_THRESHOLD).length;

  document.getElementById("count").innerText = data.length;
  document.getElementById("value").innerText = totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById("lowStockCount").innerText = lowStockCount;

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  if (pageOffset !== 0) {
    currentPage += pageOffset;
  } else {
    currentPage = 1;
  }

  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const table = document.getElementById("table");
  table.innerHTML = `
    <tr>
      <th>Product Details</th>
      <th>Category</th>
      <th>Unit Price</th>
      <th>Stock Level</th>
      <th>Date Added</th>
    </tr>
  `;

  if (paginatedData.length === 0) {
    table.innerHTML += `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">No products found in this view.</td></tr>`;
  }

  paginatedData.forEach(p => {
    const isLow = p.stock < LOW_STOCK_THRESHOLD;
    const date = p.created_at ? p.created_at.split(' ')[0] : '---';
    table.innerHTML += `
    <tr class="${isLow ? 'low-stock' : ''}">
      <td>
        <div style="font-weight: 500;">${p.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${p.id}</div>
      </td>
      <td>${p.category}</td>
      <td>₹${parseFloat(p.price).toFixed(2)}</td>
      <td>
        <span class="badge ${isLow ? 'badge-low' : 'badge-ok'}">
          ${isLow ? '<i class="ph ph-warning"></i>' : '<i class="ph ph-check-circle"></i>'}
          ${p.stock} Units
        </span>
      </td>
      <td><span style="font-size: 0.85rem; color: var(--text-muted);">${date}</span></td>
    </tr>`;
  });

  renderPagination(totalPages);
  drawCharts(data);
}

function renderPagination(totalPages) {
  const container = document.getElementById("pagination");
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `<button class="page-btn" onclick="render(-1)" ${currentPage === 1 ? 'disabled style="opacity:0.5"' : ''}><i class="ph ph-caret-left"></i></button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span style="color:var(--text-muted)">...</span>`;
    }
  }

  html += `<button class="page-btn" onclick="render(1)" ${currentPage === totalPages ? 'disabled style="opacity:0.5"' : ''}><i class="ph ph-caret-right"></i></button>`;
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  render(0);
}

/* =========================================
   CHARTS
   ========================================= */
function drawCharts(data) {
  const isDark = document.body.classList.contains("dark");
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Inter', sans-serif";

  const barCtx = document.getElementById("barChart");
  if (barChart) barChart.destroy();

  const topStock = [...data].sort((a, b) => b.stock - a.stock).slice(0, 10);

  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: topStock.map(p => p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name),
      datasets: [{
        label: "Units in Stock",
        data: topStock.map(p => p.stock),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: gridColor } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });

  const pieCtx = document.getElementById("pieChart");
  if (pieChart) pieChart.destroy();

  const categoryCounts = {};
  data.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

  pieChart = new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: pieColors.slice(0, Object.keys(categoryCounts).length),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'right', labels: { boxWidth: 12 } }
      }
    }
  });
}

function toggleDark() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  render();
}

function showToast(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = {
    success: "ph-check-circle",
    error: "ph-warning-circle",
    warning: "ph-warning",
    info: "ph-info"
  };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="ph ${icons[type]} toast-icon"></i>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3000);
}