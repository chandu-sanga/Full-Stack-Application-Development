let products = [];
let editId = null;
let editSourceTable = null;
let barChart = null;
let pieChart = null;

let currentPage = 1;
const ITEMS_PER_PAGE = 8;
const LOW_STOCK_THRESHOLD = 5;

/* =========================================
   INITIALIZATION
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
  fetchProducts();
});

/* =========================================
   CORE LOGIC (CRUD via PHP API)
   ========================================= */
async function fetchProducts() {
  try {
    const res = await fetch('api.php');
    if (!res.ok) throw new Error("Network response was not ok");
    
    // Check if the response is actually JSON. If API endpoint is missing, it might return HTML error.
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const parsed = await res.json();
      products = Array.isArray(parsed) ? parsed : [];
    } else {
      console.warn("API not reachable or not running in XAMPP. Using mock data or empty array.");
      products = []; // Backend not active
    }
    
    updateFilterOptions();
    render();
  } catch (error) {
    console.error("Fetch error: ", error);
    showToast("Connection Error", "Ensure this is running via XAMPP (http://localhost/...).", "error");
  }
}

async function saveProduct() {
  const nameEl = document.getElementById("name");
  const catEl = document.getElementById("category");
  const priceEl = document.getElementById("price");

  const pname = nameEl.value.trim();
  const cat = catEl.value.trim() || 'Uncategorized';
  const priceVal = parseFloat(priceEl.value);

  if (!pname) {
    showToast("Validation Error", "Please enter a product name.", "error");
    nameEl.focus();
    return;
  }
  if (isNaN(priceVal) || priceVal < 0) {
    showToast("Validation Error", "Please enter a valid price.", "error");
    priceEl.focus();
    return;
  }

  const p = {
    name: pname,
    category: cat,
    price: priceVal,
  };

  try {
    if (editId && editSourceTable) {
      p.id = editId;
      p.source_table = editSourceTable;
      
      const res = await fetch('api.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast("Success", `Product '${pname}' updated!`, "success");
      } else {
        showToast("Error", data.message || "Failed to update.", "error");
      }
    } else {
      const res = await fetch('api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p)
      });
      const data = await res.json();
      if (data.status === 'success') {
        showToast("Success", `Product '${pname}' added successfully!`, "success");
      } else {
        showToast("Error", data.message || "Failed to add.", "error");
      }
    }
  } catch(err) {
    showToast("Database Error", "Failed to connect to the server.", "error");
  }

  resetForm();
  await fetchProducts();
}

function resetForm() {
  editId = null;
  editSourceTable = null;
  document.getElementById("name").value = "";
  document.getElementById("category").value = "";
  document.getElementById("price").value = "";
}

async function stock(id, source_table, q) {
  const p = products.find(x => x.id == id && x.source_table == source_table);
  if (!p) return;
  
  const newStock = Math.max(0, parseInt(p.stock) + q);
  
  try {
    const res = await fetch('api.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, source_table, stock_only: true, stock: newStock })
    });
    const data = await res.json();
    if (data.status === 'success') {
      if (q > 0) showToast("Stock Added", `Added ${q} to '${p.name}'.`, "info");
      else if (q < 0) showToast("Stock Reduced", `Reduced stock of '${p.name}'.`, "warning");
      await fetchProducts();
    }
  } catch(err) {
    showToast("Error", "Could not adjust stock.", "error");
  }
}

async function del(id, source_table) {
  if(!confirm("Are you sure you want to delete this product?")) return;
  
  try {
    const res = await fetch('api.php', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, source_table })
    });
    const data = await res.json();
    if (data.status === 'success') {
      showToast("Deleted", `Product removed from inventory.`, "error");
      await fetchProducts();
    }
  } catch(err) {
    showToast("Error", "Could not delete product.", "error");
  }
}

function edit(id, source_table) {
  const p = products.find(x => x.id == id && x.source_table == source_table);
  if(!p) return;
  
  document.getElementById("name").value = p.name;
  document.getElementById("category").value = p.category;
  document.getElementById("price").value = p.price;
  editId = id;
  editSourceTable = source_table;
  
  showToast("Edit Mode", `Editing '${p.name}'.`, "info");
  document.getElementById("name").focus();
}

async function clearAll() {
  // Not supporting clear all over API by default to prevent accidental massive data loss.
  showToast("Disabled", "Clear All is disabled in Database mode for safety.", "warning");
}

/* =========================================
   UI & RENDERING
   ========================================= */
function updateFilterOptions() {
  const categories = [...new Set(products.map(p => p.category))].sort();
  const dataList = document.getElementById("categoryList");
  if(dataList) {
    dataList.innerHTML = categories.map(c => `<option value="${c}">`).join('');
  }
  
  const filter = document.getElementById("catFilter");
  if(!filter) return;
  
  const currentVal = filter.value;
  filter.innerHTML = `<option value="">All Categories</option>` + 
                     categories.map(c => `<option value="${c}">${c}</option>`).join('');
  filter.value = currentVal;
}

function render(pageOffset = 0) {
  const searchVal = document.getElementById("search").value.toLowerCase();
  const sortVal = document.getElementById("sort").value;
  const filterVal = document.getElementById("catFilter").value;

  let data = products.filter(x => {
    const matchSearch = String(x.name).toLowerCase().includes(searchVal) || String(x.category).toLowerCase().includes(searchVal);
    const matchCategory = filterVal ? x.category === filterVal : true;
    return matchSearch && matchCategory;
  });

  if (sortVal) {
    data.sort((a, b) => {
      if (sortVal === "name") return String(a.name).localeCompare(String(b.name));
      return parseFloat(a[sortVal]) < parseFloat(b[sortVal]) ? 1 : -1;
    });
  }

  const totalValue = data.reduce((sum, p) => sum + (parseFloat(p.price) * parseInt(p.stock)), 0);
  const lowStockCount = data.filter(p => parseInt(p.stock) < LOW_STOCK_THRESHOLD).length;

  document.getElementById("count").innerText = data.length;
  document.getElementById("value").innerText = totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById("lowStockCount").innerText = lowStockCount;

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  if (pageOffset !== 0) currentPage += pageOffset;
  else currentPage = 1;
  
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
      <th>Actions</th>
    </tr>
  `;

  if (paginatedData.length === 0) {
    table.innerHTML += `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">No products found or DB not connected.</td></tr>`;
  }

  paginatedData.forEach(p => {
    const isLow = parseInt(p.stock) < LOW_STOCK_THRESHOLD;
    const date = p.created_at ? p.created_at.split(' ')[0] : '---';
    table.innerHTML += `
    <tr class="${isLow ? 'low-stock' : ''}">
      <td>
        <div style="font-weight: 500;">${p.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">DB: ${p.source_table} | ID: ${p.id}</div>
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
      <td>
        <div class="action-btns">
          <button class="btn-stock-add" onclick="stock('${p.id}', '${p.source_table}', 1)" title="Add Stock"><i class="ph ph-plus"></i></button>
          <button class="btn-stock-sub" onclick="stock('${p.id}', '${p.source_table}', -1)" title="Reduce Stock"><i class="ph ph-minus"></i></button>
          <button class="btn-edit" onclick="edit('${p.id}', '${p.source_table}')" title="Edit"><i class="ph ph-pencil-simple"></i></button>
          <button class="btn-del" onclick="del('${p.id}', '${p.source_table}')" title="Delete"><i class="ph ph-trash"></i></button>
        </div>
      </td>
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
  const topStock = [...data].sort((a,b) => parseInt(b.stock) - parseInt(a.stock)).slice(0, 10);
  
  barChart = new Chart(barCtx, {
    type: "bar",
    data: {
      labels: topStock.map(p => String(p.name).length > 15 ? String(p.name).substring(0,15)+'...' : p.name),
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
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, grid: { color: gridColor } }, x: { grid: { display: false } } },
      plugins: { legend: { display: false } }
    }
  });

  const pieCtx = document.getElementById("pieChart");
  if (pieChart) pieChart.destroy();
  const categoryCounts = {};
  data.forEach(p => { categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1; });
  const pieColors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

  pieChart = new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: Object.keys(categoryCounts),
      datasets: [{
        data: Object.values(categoryCounts),
        backgroundColor: pieColors.slice(0, Object.keys(categoryCounts).length),
        borderWidth: 0, hoverOffset: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '70%',
      plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
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

function exportCSV() {
  if (products.length === 0) {
    showToast("Export Failed", "No data to export.", "warning");
    return;
  }
  let csv = "ID,Name,Category,Price,Stock\n";
  products.forEach(p => {
    let name = p.name ? String(p.name).replace(/"/g, '""') : '';
    csv += `"${p.id}","${name}","${p.category}",${p.price},${p.stock}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  showToast("Exported", "CSV downloaded successfully.", "success");
}

function exportJSON() {
  if (products.length === 0) {
    showToast("Export Failed", "No data to export.", "warning");
    return;
  }
  const dataStr = JSON.stringify(products, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
  showToast("Backup Created", "JSON backup downloaded.", "success");
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        showToast("Restoring", "Sending items to database...", "info");
        imported.forEach(async p => {
          await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: p.name,
              category: p.category,
              price: p.price,
              stock: p.stock
            })
          });
        });
        setTimeout(() => fetchProducts(), 2000);
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      showToast("Error", "Failed to parse JSON file.", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}