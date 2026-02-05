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
  name: '',
  email: '',
  password: '',
}

const resolver = ({ values }) => {
  const errors = {}
  const name = values.name?.trim() ?? ''
  const email = values.email?.trim() ?? ''
  const password = values.password ?? ''

  if (!name) {
    errors.name = ['Name is required.']
  } else if (name.length < 2) {
    errors.name = ['Name must be at least 2 characters.']
  }

  if (!email) {
    errors.email = ['Email is required.']
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = ['Enter a valid email address.']
  }

  if (!password) {
    errors.password = ['Password is required.']
  } else if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    errors.password = ['Password must be 8+ characters with letters and numbers.']
  }

  return { values, errors }
}

const mapAuthError = (err) => {
  const code = err?.code ?? ''
  if (code === 'auth/email-already-in-use') {
    return 'That email is already registered.'
  }
  if (code === 'auth/weak-password') {
    return 'Your password is too weak.'
  }
  return err?.message ?? 'Unable to create account. Please try again.'
}

const onSubmit = async ({ valid, values }) => {
  submitError.value = ''
  if (!valid) {
    return
  }
  try {
    await authStore.register({
      name: values.name?.trim(),
      email: values.email?.trim(),
      password: values.password,
    })
    router.push('/')
  } catch (err) {
    submitError.value = mapAuthError(err)
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-lg px-4 sm:px-6">
    <div class="rounded-3xl border border-black/10 bg-white/90 p-8 shadow-2xl backdrop-blur">
      <header class="space-y-2 text-left">
        <h1 class="text-3xl font-semibold text-slate-900">Create your account</h1>
        <p class="text-sm text-slate-600">Join the platform in a few steps.</p>
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
        <FormField name="name" v-slot="{ error, invalid }">
          <div class="space-y-2">
            <label class="text-sm font-medium text-slate-700">Full name</label>
            <InputText
              name="name"
              autocomplete="name"
              placeholder="Jane Doe"
              class="w-full"
              :invalid="invalid"
            />
            <p v-if="error" class="text-xs font-medium text-rose-600">{{ error }}</p>
          </div>
        </FormField>

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
              autocomplete="new-password"
              placeholder="Create a password"
              class="w-full"
              input-class="w-full"
              :invalid="invalid"
            />
            <p v-if="error" class="text-xs font-medium text-rose-600">{{ error }}</p>
          </div>
        </FormField>

        <Button type="submit" label="Create account" class="w-full" />
      </Form>

      <p class="mt-6 text-sm text-slate-600">
        Already have an account?
        <RouterLink to="/login" class="font-semibold text-slate-900">Sign in</RouterLink>
      </p>
    </div>
  </section>
</template>
