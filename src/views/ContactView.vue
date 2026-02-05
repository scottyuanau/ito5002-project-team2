<template>
  <section class="mx-auto w-full max-w-3xl space-y-6 px-4 text-left sm:px-6">
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-400">Contact</p>
      <h1 class="text-3xl font-semibold text-slate-900">Send us an enquiry</h1>
      <p class="text-sm text-slate-500">
        Share your questions or feedback and we will get back to you.
      </p>
    </header>

    <Message v-if="!isDbReady" severity="warn" :closable="false">
      Firestore is not configured. Check your .env settings.
    </Message>

    <Message v-if="submitError" severity="error" :closable="false">
      {{ submitError }}
    </Message>

    <Message v-if="submitSuccess" severity="success" :closable="false">
      {{ submitSuccess }}
    </Message>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">Name</label>
        <InputText v-model="name" class="w-full" placeholder="Jane Citizen" />
        <p v-if="errors.name" class="text-xs font-medium text-rose-600">{{ errors.name }}</p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">Email</label>
        <InputText
          v-model="email"
          type="email"
          class="w-full"
          placeholder="you@example.com"
          @input="emailTouched = true"
        />
        <p v-if="errors.email" class="text-xs font-medium text-rose-600">{{ errors.email }}</p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">Title</label>
        <InputText v-model="title" class="w-full" placeholder="How can we help?" />
        <p v-if="errors.title" class="text-xs font-medium text-rose-600">{{ errors.title }}</p>
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-slate-700">Message</label>
        <Textarea
          v-model="content"
          class="w-full"
          rows="6"
          placeholder="Write your message..."
          autoResize
        />
        <p v-if="errors.content" class="text-xs font-medium text-rose-600">
          {{ errors.content }}
        </p>
      </div>

      <Button
        type="submit"
        label="Submit enquiry"
        class="w-full sm:w-auto"
        :loading="isSubmitting"
        :disabled="isSubmitting || !isDbReady"
      />
    </form>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { db } from '../firebase'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const name = ref('')
const email = ref('')
const title = ref('')
const content = ref('')
const emailTouched = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')
const submitSuccess = ref('')
const errors = ref({})

const isDbReady = computed(() => Boolean(db))

// Pre-fill the email field for authenticated users.
watch(
  () => authStore.user?.email,
  (nextEmail) => {
    if (!emailTouched.value && nextEmail) {
      email.value = nextEmail
    }
  },
  { immediate: true }
)

// Validate form fields and return whether the submission is valid.
const validateForm = () => {
  const nextErrors = {}
  const trimmedName = name.value.trim()
  const trimmedEmail = email.value.trim()
  const trimmedTitle = title.value.trim()
  const trimmedContent = content.value.trim()

  if (!trimmedName) {
    nextErrors.name = 'Name is required.'
  }
  if (!trimmedEmail) {
    nextErrors.email = 'Email is required.'
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    nextErrors.email = 'Enter a valid email address.'
  }
  if (!trimmedTitle) {
    nextErrors.title = 'Title is required.'
  }
  if (!trimmedContent) {
    nextErrors.content = 'Message content is required.'
  }

  errors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

// Reset fields after a successful submission.
const resetForm = () => {
  name.value = ''
  title.value = ''
  content.value = ''
  emailTouched.value = false
  email.value = authStore.user?.email ?? ''
}

// Submit the enquiry to Firestore and surface status to the user.
const handleSubmit = async () => {
  submitError.value = ''
  submitSuccess.value = ''

  if (!isDbReady.value) {
    submitError.value = 'Firestore is not configured.'
    return
  }

  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  try {
    await addDoc(collection(db, 'enquiries'), {
      name: name.value.trim(),
      email: email.value.trim(),
      title: title.value.trim(),
      content: content.value.trim(),
      createdAt: serverTimestamp(),
      userId: authStore.user?.uid ?? null,
      authEmail: authStore.user?.email ?? null,
    })
    submitSuccess.value = 'Your enquiry has been sent.'
    resetForm()
  } catch (err) {
    submitError.value = err?.message ?? 'Unable to submit your enquiry.'
  } finally {
    isSubmitting.value = false
  }
}
</script>
