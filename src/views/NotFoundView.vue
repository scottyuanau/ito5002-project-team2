<template>
  <section class="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 text-center">
    <p class="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Error 404</p>
    <h1 class="text-4xl font-semibold text-slate-900 sm:text-5xl">Page not found</h1>
    <p class="max-w-xl text-sm text-slate-500 sm:text-base">
      Sorry, we could not find the page you were looking for. It may have moved or the link might
      be incorrect.
    </p>
    <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
      <RouterLink
        to="/"
        class="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Back to home
      </RouterLink>
      <RouterLink
        to="/contact"
        class="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
      >
        Contact support
      </RouterLink>
    </div>
  </section>
</template>
