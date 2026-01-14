<template>
  <div class="flex min-h-screen flex-col">
    <header class="sticky top-0 z-10 px-6 pt-6">
      <NavigationBar />
    </header>

    <main class="flex flex-1 items-center justify-center px-6 pb-8 pt-16 text-center md:pt-24">
      <RouterView />
    </main>

    <footer class="px-6 py-6 text-center text-sm text-slate-600">Footer area</footer>
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import NavigationBar from './components/NavigationBar.vue'
</script>
