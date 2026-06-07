/* Role-aware dashboards and seller inventory management. */
let currentChartRef = null;
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#dashboardRoot");
  if (!root) return;
  const user = Store.requireRole(["client", "seller"]);
  if (!user) return;
  user.role === "seller" ? renderSeller(user) : renderClient(user);

  window.addEventListener("resize", () => {
    if (currentChartRef) currentChartRef();
  });
});

function sellerStats(user) {
  const products = Store.read(Store.keys.products, []).filter((p) => p.sellerId === user.id);
  const orders = Store.read(Store.keys.orders, []);
  const soldItems = orders.flatMap((o) => o.items.map((it) => ({ ...it, orderId: o.id, createdAt: o.createdAt, buyer: o.userName }))).filter((it) => it.sellerId === user.id);
  const revenue = soldItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
  return { products, orders, soldItems, revenue };
}

function renderSeller(user) {
  const { products, soldItems, revenue } = sellerStats(user);
  const lowStock = products.filter((p) => p.stock <= 6);
  document.querySelector("#dashboardRoot").innerHTML = `<div class="section-head"><div><p class="eyebrow">Panel vendedor</p><h1>${user.name}</h1></div><button class="btn btn-primary" data-open-product-modal>Nuevo producto</button></div>
    <div class="metric-grid">
      <div class="metric"><span>Total productos</span><strong>${products.length}</strong></div>
      <div class="metric"><span>Unidades vendidas</span><strong>${soldItems.reduce((s, i) => s + i.quantity, 0)}</strong></div>
      <div class="metric"><span>Ingresos simulados</span><strong>${Store.money(revenue)}</strong></div>
      <div class="metric"><span>Bajo stock</span><strong>${lowStock.length}</strong></div>
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="section-head"><h2>Ventas por producto</h2></div><canvas id="salesChart" height="260"></canvas></section>
      <section class="panel"><div class="section-head"><h2>Productos con poco stock</h2></div><div class="list">${lowStock.map((p) => `<div class="list-row"><span>${p.name}</span><strong>${p.stock}</strong></div>`).join("") || "<p class='muted'>Inventario saludable.</p>"}</div></section>
    </div>
    <section class="panel"><div class="section-head"><h2>Inventario</h2></div><div class="table-wrap"><table><thead><tr><th>Producto</th><th>Categoria</th><th>Precio</th><th>Stock</th><th></th></tr></thead><tbody id="sellerProducts"></tbody></table></div></section>
    <section class="panel"><div class="section-head"><h2>Ultimos pedidos recibidos</h2></div><div class="list">${soldItems.slice(0, 8).map((it) => `<div class="list-row"><span>${it.name}<small>${it.buyer} · ${new Date(it.createdAt).toLocaleDateString("es-MX")}</small></span><strong>${Store.money(it.price * it.quantity)}</strong></div>`).join("") || "<p class='muted'>Aun no hay pedidos.</p>"}</div></section>
    ${productModal()}`;
  fillSellerProducts(user);
  currentChartRef = () => drawBars("salesChart", products.slice(0, 8).map((p) => ({ label: p.name.split(" ")[0], value: p.sales })));
  currentChartRef();
  bindSeller(user);
}

function fillSellerProducts(user) {
  const body = document.querySelector("#sellerProducts");
  const products = Store.read(Store.keys.products, []).filter((p) => p.sellerId === user.id);
  body.innerHTML = products.map((p) => `<tr>
    <td><div class="mini-product"><img src="${p.image}" alt="${p.name}"><span>${p.name}</span></div></td>
    <td>${p.category}</td><td>${Store.money(p.price)}</td><td class="${p.stock <= 6 ? "text-danger" : ""}">${p.stock}</td>
    <td class="actions"><button class="btn btn-sm btn-outline" data-edit-product="${p.id}">Editar</button><button class="btn btn-sm btn-danger" data-delete-product="${p.id}">Eliminar</button></td>
  </tr>`).join("");
}

function productModal() {
  return `<div class="modal-lite" id="productModal" hidden>
    <div class="modal-card">
      <div class="section-head"><h2 data-modal-title>Producto</h2><button class="icon-btn" data-close-modal>×</button></div>
      <form id="productForm" class="form-grid">
        <input type="hidden" name="id">
        <label>Nombre<input class="form-control" name="name" required></label>
        <label>Categoria<select class="form-select" name="category">${Store.categories.map((c) => `<option>${c}</option>`).join("")}</select></label>
        <label>Precio<input class="form-control" name="price" type="number" min="1" required></label>
        <label>Stock<input class="form-control" name="stock" type="number" min="0" required></label>
        <label class="span-2">Imagen URL opcional<input class="form-control" name="image" placeholder="Se genera una imagen si se deja vacio"></label>
        <label class="span-2">Descripcion<textarea class="form-control" name="description" rows="4" required></textarea></label>
        <button class="btn btn-primary span-2">Guardar producto</button>
      </form>
    </div>
  </div>`;
}

function bindSeller(user) {
  const modal = document.querySelector("#productModal");
  const form = document.querySelector("#productForm");
  document.querySelector("[data-open-product-modal]").addEventListener("click", () => openProductModal());
  document.querySelector("[data-close-modal]").addEventListener("click", () => modal.hidden = true);
  document.querySelector("#sellerProducts").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit-product]");
    const del = e.target.closest("[data-delete-product]");
    if (edit) openProductModal(edit.dataset.editProduct);
    if (del && confirm("Eliminar este producto?")) {
      Store.write(Store.keys.products, Store.read(Store.keys.products, []).filter((p) => p.id !== del.dataset.deleteProduct));
      Store.toast("Producto eliminado", "info");
      renderSeller(user);
    }
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const products = Store.read(Store.keys.products, []);
    const payload = {
      name: data.name.trim(),
      category: data.category,
      price: Number(data.price),
      stock: Number(data.stock),
      description: data.description.trim(),
      image: data.image.trim() || Store.productArt(data.name, data.category, products.length),
      sellerId: user.id,
      sellerName: user.name
    };
    const next = data.id ? products.map((p) => p.id === data.id ? { ...p, ...payload } : p) : [{ id: Store.uid("prod"), createdAt: Store.now(), sales: 0, rating: 4.5, featured: false, ...payload }, ...products];
    Store.write(Store.keys.products, next);
    modal.hidden = true;
    Store.toast("Producto guardado", "success");
    renderSeller(user);
  });
}

function openProductModal(id = "") {
  const modal = document.querySelector("#productModal");
  const form = document.querySelector("#productForm");
  form.reset();
  form.elements.id.value = "";
  document.querySelector("[data-modal-title]").textContent = id ? "Editar producto" : "Nuevo producto";
  if (id) {
    const p = Store.read(Store.keys.products, []).find((item) => item.id === id);
    Object.entries(p).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
  }
  modal.hidden = false;
}

function renderClient(user) {
  const orders = Store.read(Store.keys.orders, []).filter((o) => o.userId === user.id);
  const total = orders.reduce((sum, o) => sum + o.total, 0);
  const wishlist = Store.read(Store.keys.wishlist, {})[user.id] || [];
  const products = Store.read(Store.keys.products, []);
  document.querySelector("#dashboardRoot").innerHTML = `<div class="section-head"><div><p class="eyebrow">Panel cliente</p><h1>Hola, ${user.name}</h1></div><a class="btn btn-primary" href="products.html">Seguir comprando</a></div>
    <div class="metric-grid">
      <div class="metric"><span>Pedidos realizados</span><strong>${orders.length}</strong></div>
      <div class="metric"><span>Total gastado</span><strong>${Store.money(total)}</strong></div>
      <div class="metric"><span>Favoritos</span><strong>${wishlist.length}</strong></div>
      <div class="metric"><span>Ultima compra</span><strong>${orders[0] ? new Date(orders[0].createdAt).toLocaleDateString("es-MX") : "N/A"}</strong></div>
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="section-head"><h2>Gasto por pedido</h2></div><canvas id="spendChart" height="260"></canvas></section>
      <section class="panel"><div class="section-head"><h2>Productos favoritos</h2></div><div class="wishlist-grid">${wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 4).map(ProductUI.card).join("") || "<p class='muted'>Aun no tienes favoritos.</p>"}</div></section>
    </div>
    <section class="panel"><div class="section-head"><h2>Historial de pedidos</h2></div><div class="list">${orders.map((o) => `<div class="order-block"><div class="list-row"><span><strong>${o.id}</strong><small>${new Date(o.createdAt).toLocaleString("es-MX")}</small></span><strong>${Store.money(o.total)}</strong></div><p>${o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</p></div>`).join("") || "<p class='muted'>Todavia no hay compras.</p>"}</div></section>`;
  currentChartRef = () => drawBars("spendChart", orders.slice(0, 8).reverse().map((o) => ({ label: o.id.slice(-4), value: o.total })));
  currentChartRef();
}

function drawBars(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.offsetWidth * devicePixelRatio;
  const height = canvas.height = canvas.offsetHeight * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const w = width / devicePixelRatio;
  const h = height / devicePixelRatio;
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = data.length ? (w - 50) / data.length : 40;
  ctx.font = "12px Arial";
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted");
  if (!data.length) {
    ctx.fillText("Sin datos suficientes", 20, 40);
    return;
  }
  data.forEach((d, i) => {
    const x = 30 + i * barW;
    const barH = (d.value / max) * (h - 70);
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(x, h - barH - 32, Math.max(18, barW - 14), barH);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text");
    ctx.fillText(d.label.slice(0, 8), x, h - 10);
  });
}
