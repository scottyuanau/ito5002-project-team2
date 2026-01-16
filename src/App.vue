<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-10 px-6 pt-6">
      <NavigationBar />
    </header>

    <main class="flex flex-1 justify-center pb-8 text-center">
      <RouterView />
    </main>

    <footer class="px-6 py-6 text-center text-sm text-slate-600">
      <nav class="flex flex-wrap justify-center gap-6 uppercase tracking-[0.2em]">
        <RouterLink to="/" class="transition hover:text-slate-900">Home</RouterLink>
        <RouterLink to="/compare" class="transition hover:text-slate-900">Compare</RouterLink>
        <RouterLink to="/contact" class="transition hover:text-slate-900">Contact</RouterLink>
      </nav>
    </footer>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import NavigationBar from './components/NavigationBar.vue'
</script>
