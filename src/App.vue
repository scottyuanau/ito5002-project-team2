<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="page">
    <header class="site-header">
      <nav class="nav-bar">
        <div class="logo-area">Logo</div>
        <div class="nav-links">
          <RouterLink to="/">Home</RouterLink>
          <RouterLink to="/about">About</RouterLink>
        </div>
      </nav>
    </header>

    <main class="page-body">
      <RouterView />
    </main>

    <footer class="site-footer">Footer area</footer>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 1.5rem 1.5rem 0;
  pointer-events: none;
}

.nav-bar {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
}

.logo-area {
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-links {
  display: flex;
  gap: 1rem;
  font-size: 0.95rem;
}

.nav-links a {
  color: inherit;
  text-decoration: none;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
}

.nav-links a.router-link-exact-active {
  background: rgba(0, 0, 0, 0.08);
}

.page-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 1.5rem 2rem;
  text-align: center;
}

.site-footer {
  text-align: center;
  padding: 1.5rem;
  color: rgba(0, 0, 0, 0.6);
}

@media (min-width: 768px) {
  .nav-bar {
    padding: 1rem 2rem;
  }

  .page-body {
    padding-top: 6rem;
    font-size: 1.25rem;
  }
}
</style>
