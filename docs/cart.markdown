---
layout: page
title: Cart
permalink: /Cart/
---

<link rel="stylesheet" href="{{ '/assets/css/app.css' | relative_url }}">

<div class="app-app" id="cartPage">
  <div class="app-page-heading">
    <a class="app-back-link" href="{{ '/Summary/' | relative_url }}">Summary</a>
    <p class="app-kicker">PENDING ACTIONS</p>
    <h1>Cart</h1>
    <p>Review everything before applying it.</p>
  </div>
  <div id="cartItems" class="app-panel"></div>
  <div class="app-cart-actions">
    <button id="applyCart" type="button">Apply all</button>
    <button id="clearCart" type="button" class="app-secondary-button">Clear cart</button>
  </div>
  <div id="cartStatus" class="app-status"></div>
</div>

<script src="{{ '/assets/js/common.js' | relative_url }}"></script>
<script>
  const GITHUB_REPOSITORY = "ryanbozio/ryanbozio.github.io";
  const GITHUB_BRANCH = "main";
</script>
<script src="{{ '/assets/js/cart.js' | relative_url }}"></script>
