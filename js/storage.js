/* StoreHub storage and shared utilities. Everything persists in LocalStorage. */
const Store = (() => {
  const keys = {
    booted: "sh_booted",
    users: "sh_users",
    products: "sh_products",
    orders: "sh_orders",
    carts: "sh_carts",
    session: "sh_session",
    theme: "sh_theme",
    wishlist: "sh_wishlist",
    reviews: "sh_reviews",
    coupons: "sh_coupons",
    notifications: "sh_notifications"
  };

  const categories = ["Tecnologia", "Hogar", "Moda", "Belleza", "Deportes", "Juguetes", "Automotriz", "Oficina"];

  const images = [
    ["#1f7a8c", "#bfdbf7"], ["#ff8a5b", "#ffd5c2"], ["#5d2e8c", "#d7b8ff"], ["#0f766e", "#99f6e4"],
    ["#334155", "#cbd5e1"], ["#b45309", "#fde68a"], ["#be123c", "#fecdd3"], ["#2563eb", "#bfdbfe"]
  ];

  const uid = (prefix = "id") => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const money = (value) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(value || 0));
  const now = () => new Date().toISOString();
  const read = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function productArt(name, category, i = 0) {
    const pair = images[i % images.length];
    const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='640' viewBox='0 0 900 640'>
      <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='${pair[0]}'/><stop offset='1' stop-color='${pair[1]}'/></linearGradient></defs>
      <rect width='900' height='640' fill='url(#g)'/><circle cx='690' cy='115' r='155' fill='rgba(255,255,255,.16)'/>
      <rect x='95' y='125' width='710' height='390' rx='42' fill='rgba(255,255,255,.18)' stroke='rgba(255,255,255,.34)'/>
      <text x='450' y='300' text-anchor='middle' font-size='106' font-family='Arial' font-weight='700' fill='white'>${initials}</text>
      <text x='450' y='378' text-anchor='middle' font-size='34' font-family='Arial' fill='white'>${category}</text>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function seed() {
    if (localStorage.getItem(keys.booted)) return;

    const sellers = Array.from({ length: 5 }, (_, i) => ({
      id: `seller-${i + 1}`,
      name: ["Nova Market", "TecnoMax", "Casa Viva", "Urban Deals", "Prime Outlet"][i],
      email: `vendedor${i + 1}@storehub.test`,
      password: "123456",
      role: "seller",
      phone: `555-100${i}`,
      address: "Centro Comercial Digital",
      createdAt: now()
    }));

    const clients = Array.from({ length: 10 }, (_, i) => ({
      id: `client-${i + 1}`,
      name: `Cliente ${i + 1}`,
      email: `cliente${i + 1}@storehub.test`,
      password: "123456",
      role: "client",
      phone: `555-200${i}`,
      address: "Ciudad de Mexico",
      createdAt: now()
    }));

    const names = [
      "Laptop ultraligera Pro", "Audifonos inalambricos", "Smartwatch Elite", "Monitor 27 pulgadas", "Teclado mecanico RGB",
      "Silla ergonomica", "Cafetera barista", "Licuadora premium", "Organizador modular", "Lampara inteligente",
      "Tenis urbanos", "Mochila ejecutiva", "Chaqueta ligera", "Gafas polarizadas", "Reloj clasico",
      "Kit skincare", "Secadora ionica", "Perfume signature", "Masajeador facial", "Set maquillaje",
      "Bicicleta plegable", "Tapete yoga pro", "Balon entrenamiento", "Mancuernas ajustables", "Botella termica",
      "Autoestereo touch", "Camara dashcam", "Aspiradora para auto", "Escritorio compacto", "Mouse vertical"
    ];

    const products = names.map((name, i) => {
      const category = categories[i % categories.length];
      const seller = sellers[i % sellers.length];
      const price = [8999, 1299, 1899, 4299, 1599, 3499, 2199, 1499, 699, 899, 1399, 1199, 999, 799, 2499, 649, 1299, 1599, 749, 999, 6999, 799, 499, 2499, 399, 2699, 1599, 899, 1899, 699][i];
      return {
        id: `prod-${i + 1}`,
        name,
        description: `${name} con calidad profesional, garantia de tienda y envio simulado inmediato. Ideal para compradores que buscan valor, diseno y durabilidad.`,
        category,
        price,
        stock: 8 + ((i * 7) % 42),
        image: productArt(name, category, i),
        createdAt: now(),
        sellerId: seller.id,
        sellerName: seller.name,
        sales: (i * 3) % 27,
        featured: i % 4 === 0,
        rating: Number((3.7 + ((i % 13) / 10)).toFixed(1))
      };
    });

    const reviews = products.slice(0, 12).flatMap((p, i) => ([
      { id: uid("rev"), productId: p.id, userId: clients[i % clients.length].id, userName: clients[i % clients.length].name, rating: 4 + (i % 2), text: "Buen producto, entrega simulada clara y calidad acorde al precio.", createdAt: now() }
    ]));

    write(keys.users, [...sellers, ...clients]);
    write(keys.products, products);
    write(keys.orders, []);
    write(keys.carts, {});
    write(keys.wishlist, {});
    write(keys.reviews, reviews);
    write(keys.coupons, [{ code: "BIENVENIDO10", discount: 10 }, { code: "STORE15", discount: 15 }]);
    write(keys.notifications, []);
    localStorage.setItem(keys.booted, "1");
  }

  function currentUser() {
    const id = localStorage.getItem(keys.session);
    return id ? read(keys.users, []).find((u) => u.id === id) || null : null;
  }

  function setTheme(theme) {
    localStorage.setItem(keys.theme, theme);
    document.documentElement.dataset.theme = theme;
  }

  function applyTheme() {
    setTheme(localStorage.getItem(keys.theme) || "light");
  }

  function toast(message, type = "success") {
    let host = document.querySelector(".toast-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "toast-host";
      document.body.appendChild(host);
    }
    const item = document.createElement("div");
    item.className = `app-toast ${type}`;
    item.textContent = message;
    host.appendChild(item);
    setTimeout(() => item.classList.add("show"), 10);
    setTimeout(() => {
      item.classList.remove("show");
      setTimeout(() => item.remove(), 220);
    }, 3200);
  }

  function requireRole(roles) {
    const user = currentUser();
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!user || !allowed.includes(user.role)) {
      location.href = user ? "index.html" : "login.html";
      return null;
    }
    return user;
  }

  function updateHeader() {
    const user = currentUser();
    const badge = document.querySelector("[data-cart-count]");
    if (badge && user) {
      const carts = read(keys.carts, {});
      const count = (carts[user.id] || []).reduce((sum, it) => sum + it.quantity, 0);
      badge.textContent = count;
    }
    document.querySelectorAll("[data-auth]").forEach((el) => {
      const mode = el.dataset.auth;
      el.hidden = mode === "in" ? !user : !!user;
    });
    document.querySelectorAll("[data-role]").forEach((el) => {
      el.hidden = !user || el.dataset.role !== user.role;
    });
    const name = document.querySelector("[data-user-name]");
    if (name) name.textContent = user ? user.name : "Visitante";
  }

  function initLayout() {
    seed();
    applyTheme();
    updateHeader();
    const toggle = document.querySelector("[data-theme-toggle]");
    if (toggle) toggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    document.querySelectorAll("[data-logout]").forEach((btn) => btn.addEventListener("click", () => {
      localStorage.removeItem(keys.session);
      toast("Sesion cerrada", "info");
      setTimeout(() => location.href = "index.html", 400);
    }));
    setTimeout(() => document.body.classList.add("ready"), 150);
  }

  return { keys, categories, uid, money, now, read, write, seed, currentUser, requireRole, toast, updateHeader, initLayout, productArt };
})();

document.addEventListener("DOMContentLoaded", Store.initLayout);
