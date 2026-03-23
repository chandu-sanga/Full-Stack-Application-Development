const KEY="inventory_products";

let products=JSON.parse(localStorage.getItem(KEY))||[];
let editId=null;
let chart=null;

/* SAVE */
function save(){
  localStorage.setItem(KEY,JSON.stringify(products));
}

/* ADD / EDIT PRODUCT (FIXED BUG HERE) */
function saveProduct(){

  const pname=document.getElementById("name").value.trim();
  const cat=document.getElementById("category").value.trim();
  const priceVal=+document.getElementById("price").value;

  if(!pname){
    alert("Enter product name");
    return;
  }

  const p={
    id:editId||Date.now(),
    name:pname,
    category:cat,
    price:priceVal||0,
    stock: editId ? products.find(x=>x.id===editId).stock : 0
  };

  if(editId)
    products=products.map(x=>x.id===editId?p:x);
  else
    products.push(p);

  resetForm();
  save();
  render();
}

function resetForm(){
  editId=null;
  name.value=category.value=price.value="";
}

/* STOCK */
function stock(id,q){
  products.forEach(x=>{
    if(x.id===id){
      x.stock=Math.max(0,x.stock+q);
    }
  });
  save();
  render();
}

/* DELETE */
function del(id){
  products=products.filter(x=>x.id!==id);
  save();
  render();
}

/* EDIT */
function edit(id){
  const p=products.find(x=>x.id===id);
  name.value=p.name;
  category.value=p.category;
  price.value=p.price;
  editId=id;
}

/* RENDER */
function render(){

  let data=[...products];

  if(search.value)
    data=data.filter(x=>x.name.toLowerCase().includes(search.value.toLowerCase()));

  if(sort.value)
    data.sort((a,b)=>a[sort.value]>b[sort.value]?1:-1);

  table.innerHTML="<tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>";

  let total=0;

  data.forEach(p=>{
    total+=p.price*p.stock;

    table.innerHTML+=`
    <tr class="${p.stock<5?'low':''}">
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${p.price}</td>
      <td>${p.stock}</td>
      <td>
        <button onclick="stock(${p.id},1)">+</button>
        <button onclick="stock(${p.id},-1)">-</button>
        <button onclick="edit(${p.id})">Edit</button>
        <button onclick="del(${p.id})">Delete</button>
      </td>
    </tr>`;
  });

  count.innerText=data.length;
  value.innerText=total.toFixed(2);

  drawChart();
}

/* CHART */
function drawChart(){

  const ctx=document.getElementById("chart");

  if(chart) chart.destroy();

  chart=new Chart(ctx,{
    type:"bar",
    data:{
      labels:products.map(p=>p.name),
      datasets:[{label:"Stock",data:products.map(p=>p.stock)}]
    }
  });
}

/* EXPORT */
function exportCSV(){
  let csv="Name,Category,Price,Stock\n";
  products.forEach(p=>csv+=`${p.name},${p.category},${p.price},${p.stock}\n`);
  download(csv,"inventory.csv");
}

function exportJSON(){
  download(JSON.stringify(products),"backup.json");
}

function importJSON(e){
  const r=new FileReader();
  r.onload=()=>{
    products=JSON.parse(r.result);
    save();
    render();
  };
  r.readAsText(e.target.files[0]);
}

function download(data,file){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([data]));
  a.download=file;
  a.click();
}

function clearAll(){
  products=[];
  save();
  render();
}

function toggleDark(){
  document.body.classList.toggle("dark");
}

/* START */
render();