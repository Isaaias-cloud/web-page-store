/* Product catalog, detail page, wishlist, reviews and seller CRUD. */
const ProductUI = (() => {
  const state = { page: 1, perPage: 9, query: "", category: "all", sort: "featured" };

  function filteredProducts() {
    let list = Store.read(Store.keys.products, []);
    if (state.query) {
      const q = state.query.toLowerCase();
      list = list.filter((p) => `${p.name} ${p.description} ${p.category} ${p.sellerName}`.toLowerCase().includes(q));
    }
    if (state.category !== "all") list = list.filter((p) => p.category === state.category);
    const sorters = {
      featured: (a, b) => Number(b.featured) - Number(a.featured) || b.sales - a.sales,
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    };
    return list.sort(sorters[state.sort] || sorters.featured);
  }

  function card(product) {
    const user = Store.currentUser();
    const wishlist = Store.read(Store.keys.wishlist, {});
    const loved = user && (wishlist[user.id] || []).includes(product.id);
    return `<article class="product-card">
      <a href="product.html?id=${product.id}" class="product-media"><img src="${product.image}" alt="${product.name}"></a>
      <div class="product-body">
        <div class="d-flex justify-content-between align-items-start gap-2">
          <span class="badge-soft">${product.category}</span>
          <button class="icon-btn ${loved ? "active" : ""}" data-favorite="${product.id}" title="Favorito">♡</button>
        </div>
        <h3><a href="product.html?id=${product.id}">${product.name}</a></h3>
        <p>${product.description}</p>
        <div class="rating">★ ${product.rating} · ${product.sales} vendidos</div>
        <div class="product-footer">
          <strong>${Store.money(product.price)}</strong>
          <button class="btn btn-primary btn-sm" data-add-cart="${product.id}" ${product.stock < 1 ? "disabled" : ""}>Agregar</button>
        </div>
      </div>
    </article>`;
  }

  function renderCatalog() {
    const grid = document.querySelector("#productGrid");
    if (!grid) return;
    const list = filteredProducts();
    const start = (state.page - 1) * state.perPage;
    const pageItems = list.slice(start, start + state.perPage);
    grid.innerHTML = pageItems.length ? pageItems.map(card).join("") : `<div class="empty-state">No encontramos productos con esos filtros.</div>`;
    document.querySelector("#resultCount").textContent = `${list.length} productos`;
    renderPagination(list.length);
  }

  function renderPagination(total) {
    const host = document.querySelector("#pagination");
    if (!host) return;
    const pages = Math.max(1, Math.ceil(total / state.perPage));
    host.innerHTML = Array.from({ length: pages }, (_, i) => `<button class="page-btn ${state.page === i + 1 ? "active" : ""}" data-page="${i + 1}">${i + 1}</button>`).join("");
  }

  function initCatalog() {
    if (!document.querySelector("#productGrid")) return;
    const params = new URLSearchParams(location.search);
    state.query = params.get("q") || "";
    state.category = params.get("category") || "all";
    const cat = document.querySelector("#categoryFilter");
    cat.innerHTML = `<option value="all">Todas las categorias</option>${Store.categories.map((c) => `<option>${c}</option>`).join("")}`;
    document.querySelector("#searchInput").value = state.query;
    cat.value = state.category;
    document.querySelector("#searchInput").addEventListener("input", (e) => { state.query = e.target.value; state.page = 1; renderCatalog(); });
    cat.addEventListener("change", (e) => { state.category = e.target.value; state.page = 1; renderCatalog(); });
    document.querySelector("#sortFilter").addEventListener("change", (e) => { state.sort = e.target.value; renderCatalog(); });
    document.querySelector("#pagination").addEventListener("click", (e) => {
      if (!e.target.dataset.page) return;
      state.page = Number(e.target.dataset.page);
      renderCatalog();
      scrollTo({ top: 0, behavior: "smooth" });
    });
    renderCatalog();
  }

  function initDetail() {
    const host = document.querySelector("#productDetail");
    if (!host) return;
    const id = new URLSearchParams(location.search).get("id");
    const product = Store.read(Store.keys.products, []).find((p) => p.id === id);
    if (!product) {
      host.innerHTML = `<div class="empty-state">Producto no encontrado.</div>`;
      return;
    }
    const reviews = Store.read(Store.keys.reviews, []).filter((r) => r.productId === id);
    host.innerHTML = `<section class="detail-grid">
      <div class="detail-image"><img src="${product.image}" alt="${product.name}"></div>
      <div class="detail-info">
        <span class="badge-soft">${product.category}</span>
        <h1>${product.name}</h1>
        <p>${product.description}</p>
        <div class="rating">★ ${product.rating} · ${product.sales} vendidos · Vendido por ${product.sellerName}</div>
        <div class="price-xl">${Store.money(product.price)}</div>
        <div class="stock ${product.stock < 6 ? "low" : ""}">${product.stock} disponibles</div>
        <div class="action-row">
          <button class="btn btn-primary" data-add-cart="${product.id}">Agregar al carrito</button>
          <button class="btn btn-outline" data-favorite="${product.id}">Guardar favorito</button>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="section-head"><h2>Resenas</h2><span>${reviews.length} opiniones</span></div>
      <form id="reviewForm" class="review-form">
        <select name="rating" class="form-select"><option value="5">5 estrellas</option><option value="4">4 estrellas</option><option value="3">3 estrellas</option></select>
        <input name="text" class="form-control" placeholder="Comparte tu experiencia" required>
        <button class="btn btn-primary">Publicar</button>
      </form>
      <div id="reviewList" class="review-list">${reviews.map((r) => `<div class="review"><strong>${r.userName}</strong><span>★ ${r.rating}</span><p>${r.text}</p></div>`).join("") || "<p class='muted'>Aun no hay resenas.</p>"}</div>
    </section>`;
    document.querySelector("#reviewForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const user = Store.currentUser();
      if (!user) return Store.toast("Inicia sesion para opinar", "warning");
      const reviewsAll = Store.read(Store.keys.reviews, []);
      reviewsAll.unshift({ id: Store.uid("rev"), productId: id, userId: user.id, userName: user.name, rating: e.target.rating.value, text: e.target.text.value.trim(), createdAt: Store.now() });
      Store.write(Store.keys.reviews, reviewsAll);
      Store.toast("Resena publicada", "success");
      initDetail();
    });
  }

  function bindGlobal() {
    document.body.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add-cart]");
      const fav = e.target.closest("[data-favorite]");
      if (add) Cart.add(add.dataset.addCart);
      if (fav) toggleFavorite(fav.dataset.favorite);
    });
  }

  function toggleFavorite(productId) {
    const user = Store.currentUser();
    if (!user) return Store.toast("Inicia sesion para guardar favoritos", "warning");
    const wish = Store.read(Store.keys.wishlist, {});
    const list = new Set(wish[user.id] || []);
    list.has(productId) ? list.delete(productId) : list.add(productId);
    wish[user.id] = [...list];
    Store.write(Store.keys.wishlist, wish);
    Store.toast(list.has(productId) ? "Agregado a favoritos" : "Eliminado de favoritos", "info");
    renderCatalog();
  }

  return { initCatalog, initDetail, bindGlobal, card };
})();

document.addEventListener("DOMContentLoaded", () => {
  ProductUI.initCatalog();
  ProductUI.initDetail();
  ProductUI.bindGlobal();
});
