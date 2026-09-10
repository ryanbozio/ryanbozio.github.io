---
layout: page
title: Store
permalink: /Store/
---

<link rel="stylesheet" href="{{ '/assets/css/app.css' | relative_url }}">

<div class="app-app" id="storePage">
  <div class="app-page-heading">
    <p class="app-kicker">REWARDS</p>
    <h1>Store</h1>
    <p>Trade your points for something good.</p>
  </div>
  <div id="storeBalance" class="app-child-balance"></div>
  <div id="storeItems" class="app-store-grid"></div>
  <div id="storeStatus" class="app-status"></div>
</div>

<script src="{{ '/assets/js/common.js' | relative_url }}"></script>
<script>
  const GITHUB_REPOSITORY = "ryanbozio/ryanbozio.github.io";
</script>
<script src="{{ '/assets/js/store.js' | relative_url }}"></script>
