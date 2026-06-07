/* Home page and small shared widgets. */
document.addEventListener("DOMContentLoaded", () => {
  renderHome();
  bindNewsletter();
});

function renderHome() {
  const featured = document.querySelector("#featuredProducts");
  const categories = document.querySelector("#homeCategories");
  const ranking = document.querySelector("#salesRanking");
  if (!featured && !categories && !ranking) return;
  const products = Store.read(Store.keys.products, []);
  if (featured) featured.innerHTML = products.filter((p) => p.featured).slice(0, 8).map(ProductUI.card).join("");
  if (categories) {
    categories.innerHTML = Store.categories.map((cat) => {
      const count = products.filter((p) => p.category === cat).length;
      return `<a class="category-tile" href="products.html?category=${encodeURIComponent(cat)}"><span>${cat}</span><strong>${count}</strong></a>`;
    }).join("");
  }
  if (ranking) {
    ranking.innerHTML = products.sort((a, b) => b.sales - a.sales).slice(0, 5).map((p, i) => `<div class="rank-row"><span>${i + 1}</span><img src="${p.image}" alt="${p.name}"><div><strong>${p.name}</strong><small>${p.sales} vendidos</small></div><b>${Store.money(p.price)}</b></div>`).join("");
  }
}

function bindNewsletter() {
  const form = document.querySelector("#helpForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    Store.toast("Mensaje recibido. Nuestro centro de ayuda simulado te respondera pronto.", "success");
    form.reset();
  });
}
