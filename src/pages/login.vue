<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">🔐 LoL Teacher</h1>
        <p class="login-subtitle">アクセスにはパスワードが必要です</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label for="password" class="input-label">パスワード</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="password-input"
            placeholder="パスワードを入力してください"
            :disabled="authStore.isLoading"
            required
          />
        </div>

        <div v-if="authStore.error" class="error-message">
          {{ authStore.error }}
        </div>

        <button
          type="submit"
          class="login-button"
          :disabled="authStore.isLoading || !password.trim()"
        >
          <span v-if="authStore.isLoading" class="loading-spinner"></span>
          {{ authStore.isLoading ? 'ログイン中...' : 'ログイン' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

definePageMeta({
  layout: false
})

const authStore = useAuthStore()
const password = ref('')

// 既にログイン済みの場合はホームにリダイレクト
onMounted(() => {
  if (authStore.isAuthenticated) {
    navigateTo('/')
  }
})

const handleLogin = async () => {
  authStore.clearError()
  
  const success = await authStore.login(password.value)
  
  if (success) {
    await navigateTo('/')
  }
}

// エラーをクリアする
watchEffect(() => {
  if (password.value && authStore.error) {
    authStore.clearError()
  }
})
</script>

<style>
@import "@/assets/styles/components/LoginPage.css";
</style>