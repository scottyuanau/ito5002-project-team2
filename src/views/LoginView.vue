<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Form from '@primevue/forms/form'
import FormField from '@primevue/forms/formfield'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const submitError = ref('')

const initialValues = {
  email: '',
  password: '',
}

const resolver = ({ values }) => {
  const errors = {}
  const email = values.email?.trim() ?? ''
  const password = values.password ?? ''

  if (!email) {
    errors.email = ['Email is required.']
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = ['Enter a valid email address.']
  }

  if (!password) {
    errors.password = ['Password is required.']
  }

  return { values, errors }
}

const mapAuthError = (err) => {
  const code = err?.code ?? ''
  if (code === 'auth/invalid-credential') {
    return 'Invalid email or password.'
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was cancelled.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please try again later.'
  }
  return err?.message ?? 'Unable to sign in. Please try again.'
}

const onSubmit = async ({ valid, values }) => {
  submitError.value = ''
  if (!valid) {
    return
  }
  try {
    await authStore.login({
      email: values.email?.trim(),
      password: values.password,
    })
    router.push('/')
  } catch (err) {
    submitError.value = mapAuthError(err)
  }
}

const onGoogleLogin = async () => {
  submitError.value = ''
  try {
    await authStore.loginWithGoogle()
    router.push('/')
  } catch (err) {
    submitError.value = mapAuthError(err)
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-lg">
    <div class="rounded-3xl border border-black/10 bg-white/90 p-8 shadow-2xl backdrop-blur">
      <header class="space-y-2 text-left">
        <h1 class="text-3xl font-semibold text-slate-900">Welcome back</h1>
        <p class="text-sm text-slate-600">Sign in to continue.</p>
      </header>

      <Message v-if="!authStore.isConfigured" severity="warn" :closable="false" class="mt-6">
        Firebase auth is not configured. Check your .env settings.
      </Message>

      <Message v-if="submitError" severity="error" :closable="false" class="mt-4">
        {{ submitError }}
      </Message>

      <Form
        class="mt-6 space-y-4"
        :resolver="resolver"
        :initial-values="initialValues"
        :validate-on-blur="true"
        @submit="onSubmit"
      >
        <FormField name="email" v-slot="{ error, invalid }">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Email</label>
            <InputText
              name="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full"
              :invalid="invalid"
            />
            <p v-if="error" class="text-xs font-medium text-rose-600">{{ error }}</p>
          </div>
        </FormField>

        <FormField name="password" v-slot="{ error, invalid }">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Password</label>
            <Password
              name="password"
              toggle-mask
              :feedback="false"
              autocomplete="current-password"
              placeholder="Your password"
              class="w-full"
              input-class="w-full"
              :invalid="invalid"
            />
            <p v-if="error" class="text-xs font-medium text-rose-600">{{ error }}</p>
          </div>
        </FormField>

        <Button type="submit" label="Sign in" class="w-full" />
      </Form>

      <div class="mt-6 flex items-center gap-3 text-xs text-slate-500">
        <span class="h-px flex-1 bg-slate-200"></span>
        Or continue with
        <span class="h-px flex-1 bg-slate-200"></span>
      </div>

      <Button
        label="Google"
        icon="pi pi-google"
        class="mt-4 w-full"
        severity="secondary"
        @click="onGoogleLogin"
      />

      <p class="mt-6 text-sm text-slate-600">
        Don’t have an account?
        <RouterLink to="/register" class="font-semibold text-slate-900">Create one</RouterLink>
      </p>
    </div>
  </section>
</template>
