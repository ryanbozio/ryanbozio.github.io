const cartItems = document.getElementById("cartItems");
const cartStatus = document.getElementById("cartStatus");
const applyCartButton = document.getElementById("applyCart");
const clearCartButton = document.getElementById("clearCart");
let cartChildren = {};

function showCartStatus(message, isError) {
  cartStatus.textContent = message;
  cartStatus.className = `app-status app-status-visible ${isError ? "app-status-error" : "app-status-success"}`;
}

function renderCart() {
  const actions = pendingCart();
  applyCartButton.disabled = actions.length === 0;
  clearCartButton.disabled = actions.length === 0;
  const familyAction = (action) => action.action === "add_chore" || action.action === "add_prize";
  const childName = (action) => action.payload.childName || cartChildren[action.payload.childId] || (familyAction(action) ? "Family" : "Unknown child");
  cartItems.innerHTML = actions.length
    ? `<ol class="app-cart-list">${actions.map((action) => `<li><div><strong>For: ${escapeHtml(childName(action))}</strong><span>${escapeHtml(action.label)}</span></div><button type="button" class="app-remove-cart-item" data-action-id="${escapeHtml(action.id)}">Remove</button></li>`).join("")}</ol>`
    : "<p class=\"app-muted\">Your cart is empty.</p>";
}

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action-id]");
  if (!button) return;
  removePendingAction(button.dataset.actionId);
  renderCart();
});

clearCartButton.addEventListener("click", () => {
  clearPendingCart();
  showCartStatus("Cart cleared.", false);
  renderCart();
});

applyCartButton.addEventListener("click", async () => {
  applyCartButton.disabled = true;
  clearCartButton.disabled = true;
  showCartStatus("Checking your cart...", false);
  try {
    await applyPendingCart();
    showCartStatus("All actions applied.", false);
    renderCart();
  } catch (error) {
    showCartStatus(error.message, true);
    renderCart();
  }
});

window.addEventListener("storage", renderCart);
fetchCSV("/data/children.csv")
  .then((children) => {
    cartChildren = Object.fromEntries(children.map((child) => [child.id, child.name]));
    renderCart();
  })
  .catch(() => renderCart());
