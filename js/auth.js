/* Authentication, registration and profile management. */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#loginForm");
  const registerForm = document.querySelector("#registerForm");
  const profileForm = document.querySelector("#profileForm");
  const user = Store.currentUser();

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = loginForm.email.value.trim().toLowerCase();
      const password = loginForm.password.value;
      const users = Store.read(Store.keys.users, []);
      const found = users.find((u) => u.email.toLowerCase() === email && u.password === password);
      if (!found) return Store.toast("Credenciales incorrectas", "danger");
      localStorage.setItem(Store.keys.session, found.id);
      Store.toast(`Bienvenido, ${found.name}`, "success");
      setTimeout(() => location.href = found.role === "seller" ? "dashboard.html" : "products.html", 500);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(registerForm));
      const users = Store.read(Store.keys.users, []);
      if (data.password.length < 6) return Store.toast("La contrasena debe tener al menos 6 caracteres", "danger");
      if (users.some((u) => u.email.toLowerCase() === data.email.trim().toLowerCase())) return Store.toast("Ese correo ya esta registrado", "danger");
      const created = {
        id: Store.uid(data.role),
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: data.role,
        phone: data.phone.trim(),
        address: data.address.trim(),
        createdAt: Store.now()
      };
      Store.write(Store.keys.users, [...users, created]);
      localStorage.setItem(Store.keys.session, created.id);
      Store.toast("Cuenta creada correctamente", "success");
      setTimeout(() => location.href = created.role === "seller" ? "dashboard.html" : "products.html", 600);
    });
  }

  if (profileForm) {
    const required = Store.requireRole(["client", "seller"]);
    if (!required) return;
    profileForm.name.value = required.name;
    profileForm.email.value = required.email;
    profileForm.phone.value = required.phone || "";
    profileForm.address.value = required.address || "";
    document.querySelector("[data-profile-role]").textContent = required.role === "seller" ? "Vendedor" : "Cliente";
    profileForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const users = Store.read(Store.keys.users, []);
      const next = users.map((u) => u.id === required.id ? {
        ...u,
        name: profileForm.name.value.trim(),
        phone: profileForm.phone.value.trim(),
        address: profileForm.address.value.trim(),
        password: profileForm.password.value ? profileForm.password.value : u.password
      } : u);
      Store.write(Store.keys.users, next);
      Store.toast("Perfil actualizado", "success");
      Store.updateHeader();
    });
  }
});
