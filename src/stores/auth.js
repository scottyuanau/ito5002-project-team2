import { defineStore } from 'pinia'
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { auth, missingKeys } from '../firebase'

const getDisplayName = (user) => {
  if (!user) {
    return ''
  }
  if (user.displayName) {
    return user.displayName
  }
  if (user.email) {
    return user.email.split('@')[0]
  }
  return ''
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false,
    error: null,
  }),
  getters: {
    displayName: (state) => getDisplayName(state.user),
    isAuthenticated: (state) => Boolean(state.user),
    isConfigured: () => Boolean(auth) && missingKeys.length === 0,
  },
  actions: {
    init() {
      if (!auth || missingKeys.length > 0) {
        this.error = 'Firebase auth is not configured. Check your .env values.'
        this.ready = true
        return
      }
      onAuthStateChanged(
        auth,
        (user) => {
          this.user = user
          this.ready = true
        },
        (err) => {
          this.error = err?.message ?? 'Failed to initialize authentication.'
          this.ready = true
        }
      )
    },
    async register({ name, email, password }) {
      if (!auth) {
        throw new Error('Firebase auth is not configured.')
      }
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      if (name) {
        await updateProfile(credential.user, { displayName: name })
      }
      this.user = credential.user
      return credential.user
    },
    async login({ email, password }) {
      if (!auth) {
        throw new Error('Firebase auth is not configured.')
      }
      const credential = await signInWithEmailAndPassword(auth, email, password)
      this.user = credential.user
      return credential.user
    },
    async loginWithGoogle() {
      if (!auth) {
        throw new Error('Firebase auth is not configured.')
      }
      const provider = new GoogleAuthProvider()
      const credential = await signInWithPopup(auth, provider)
      this.user = credential.user
      return credential.user
    },
    async logout() {
      if (!auth) {
        return
      }
      await signOut(auth)
      this.user = null
    },
    // Update the current user's display name shown across the app UI.
    async updateDisplayName({ displayName }) {
      if (!auth || !auth.currentUser) {
        throw new Error('Firebase auth is not configured.')
      }
      const nextDisplayName = (displayName || '').trim()
      if (!nextDisplayName) {
        throw new Error('Display name cannot be empty.')
      }
      await updateProfile(auth.currentUser, { displayName: nextDisplayName })
      this.user = { ...auth.currentUser }
      return this.user
    },
    // Re-authenticate with the current password before updating to a new password.
    async updatePassword({ currentPassword, newPassword }) {
      if (!auth || !auth.currentUser) {
        throw new Error('Firebase auth is not configured.')
      }
      const user = auth.currentUser
      if (!user.email) {
        throw new Error('No email is associated with this account.')
      }
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)
      this.user = auth.currentUser
      return auth.currentUser
    },
  },
})
