/* Cart and checkout. */
const Cart = (() => {
  const taxRate = 0.16;

  function getUserCart() {
    const user = Store.currentUser();
    if (!user) return null;
    const carts = Store.read(Store.keys.carts, {});
    return { user, carts, items: carts[user.id] || [] };
  }

  function save(userId, carts, items) {
    carts[userId] = items;
    Store.write(Store.keys.carts, carts);
    Store.updateHeader();
  }

  function add(productId, qty = 1) {
    const data = getUserCart();
    if (!data) return Store.toast("Inicia sesion para comprar", "warning");
    if (data.user.role !== "client") return Store.toast("Solo las cuentas cliente pueden comprar", "warning");
    const product = Store.read(Store.keys.products, []).find((p) => p.id === productId);
    if (!product || product.stock < 1) return Store.toast("Producto sin stock", "danger");
    const item = data.items.find((i) => i.productId === productId);
    if (item) item.quantity = Math.min(product.stock, item.quantity + qty);
    else data.items.push({ productId, quantity: qty });
    save(data.user.id, data.carts, data.items);
    Store.toast("Producto agregado al carrito", "success");
    render();
  }

  function update(productId, quantity) {
    const data = getUserCart();
    if (!data) return;
    const products = Store.read(Store.keys.products, []);
    const product = products.find((p) => p.id === productId);
    const nextQty = Math.max(0, Math.min(product ? product.stock : 0, quantity));
    const items = nextQty ? data.items.map((i) => i.productId === productId ? { ...i, quantity: nextQty } : i) : data.items.filter((i) => i.productId !== productId);
    save(data.user.id, data.carts, items);
    render();
  }

  function totals(items, products, couponCode = "") {
    const subtotal = items.reduce((sum, it) => {
      const product = products.find((p) => p.id === it.productId);
      return sum + (product ? product.price * it.quantity : 0);
    }, 0);
    const coupon = Store.read(Store.keys.coupons, []).find((c) => c.code === couponCode.toUpperCase());
    const discount = coupon ? subtotal * (coupon.discount / 100) : 0;
    const iva = (subtotal - discount) * taxRate;
    return { subtotal, discount, iva, total: subtotal - discount + iva, coupon };
  }

  function render() {
    const host = document.querySelector("#cartItems");
    if (!host) return;
    const data = getUserCart();
    const user = Store.requireRole("client");
    if (!data || !user) return;
    const products = Store.read(Store.keys.products, []);
    const couponCode = document.querySelector("#couponInput")?.value || "";
    const summary = totals(data.items, products, couponCode);
    host.innerHTML = data.items.length ? data.items.map((it) => {
      const p = products.find((prod) => prod.id === it.productId);
      if (!p) return "";
      return `<div class="cart-row">
        <img src="${p.image}" alt="${p.name}">
        <div><h3>${p.name}</h3><p>${p.category} · Stock ${p.stock}</p><strong>${Store.money(p.price)}</strong></div>
        <div class="qty">
          <button data-cart-dec="${p.id}">−</button><span>${it.quantity}</span><button data-cart-inc="${p.id}">+</button>
        </div>
        <button class="icon-btn danger" data-cart-remove="${p.id}" title="Eliminar">×</button>
      </div>`;
    }).join("") : `<div class="empty-state">Tu carrito esta vacio.</div>`;
    document.querySelector("#cartSubtotal").textContent = Store.money(summary.subtotal);
    document.querySelector("#cartDiscount").textContent = `-${Store.money(summary.discount)}`;
    document.querySelector("#cartTax").textContent = Store.money(summary.iva);
    document.querySelector("#cartTotal").textContent = Store.money(summary.total);
    document.querySelector("#couponStatus").textContent = summary.coupon ? `Cupon aplicado: ${summary.coupon.discount}%` : "";
  }

  function checkout() {
    const data = getUserCart();
    if (!data || !data.items.length) return Store.toast("Tu carrito esta vacio", "warning");
    const products = Store.read(Store.keys.products, []);
    const invalid = data.items.find((it) => {
      const product = products.find((p) => p.id === it.productId);
      return !product || product.stock < it.quantity;
    });
    if (invalid) return Store.toast("Uno de los productos ya no tiene stock suficiente", "danger");
    const couponCode = document.querySelector("#couponInput")?.value || "";
    const summary = totals(data.items, products, couponCode);
    const order = {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      userId: data.user.id,
      userName: data.user.name,
      items: data.items.map((it) => {
        const p = products.find((prod) => prod.id === it.productId);
        return { productId: p.id, name: p.name, sellerId: p.sellerId, sellerName: p.sellerName, price: p.price, quantity: it.quantity };
      }),
      subtotal: summary.subtotal,
      discount: summary.discount,
      tax: summary.iva,
      total: summary.total,
      status: "Confirmado",
      createdAt: Store.now()
    };
    const updatedProducts = products.map((p) => {
      const bought = data.items.find((it) => it.productId === p.id);
      return bought ? { ...p, stock: p.stock - bought.quantity, sales: p.sales + bought.quantity } : p;
    });
    Store.write(Store.keys.products, updatedProducts);
    Store.write(Store.keys.orders, [order, ...Store.read(Store.keys.orders, [])]);
    save(data.user.id, data.carts, []);
    Store.toast(`Pedido ${order.id} confirmado`, "success");
    setTimeout(() => location.href = "dashboard.html", 800);
  }

  function bindCartPage() {
    if (!document.querySelector("#cartItems")) return;
    document.body.addEventListener("click", (e) => {
      const inc = e.target.closest("[data-cart-inc]");
      const dec = e.target.closest("[data-cart-dec]");
      const rem = e.target.closest("[data-cart-remove]");
      const data = getUserCart();
      if (!data) return;
      if (inc) update(inc.dataset.cartInc, (data.items.find((i) => i.productId === inc.dataset.cartInc)?.quantity || 0) + 1);
      if (dec) update(dec.dataset.cartDec, (data.items.find((i) => i.productId === dec.dataset.cartDec)?.quantity || 0) - 1);
      if (rem) update(rem.dataset.cartRemove, 0);
    });
    document.querySelector("#couponInput").addEventListener("input", render);
    document.querySelector("#emptyCart").addEventListener("click", () => {
      const data = getUserCart();
      if (!data) return;
      save(data.user.id, data.carts, []);
      Store.toast("Carrito vaciado", "info");
      render();
    });
    document.querySelector("#checkoutBtn").addEventListener("click", checkout);
    render();
  }

  return { add, update, render, bindCartPage, totals };
})();

document.addEventListener("DOMContentLoaded", Cart.bindCartPage);
