<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

// メタ情報の設定
useHead({
  htmlAttrs: { lang: 'ja' }
})

// 認証ストアの初期化
const authStore = useAuthStore()

// クライアントサイドでのみ実行
onMounted(() => {
  authStore.initializeAuthFromSession()
})
</script>