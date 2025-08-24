<template>
  <div class="app-container">
    <AppHeader v-if="shouldShowHeaders" />
    <main class="main-content">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import AppHeader from '~/components/common/AppHeader.vue'

// メタ情報の設定
useHead({
  htmlAttrs: { lang: 'ja' },
  bodyAttrs: {
    class: 'lol-body-bg'
  }
})

// 認証ストアの初期化
const authStore = useAuthStore()
const route = useRoute()

// ヘッダーを表示すべきか判定する算出プロパティ
const shouldShowHeaders = computed(() => {
  // ログインページではヘッダーを表示しない
  return route.path !== '/login'
})


// クライアントサイドでのみ実行
onMounted(() => {
  authStore.initializeAuthFromSession()
})
</script>

<style>
/* グローバルなスタイル調整 */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
}

.lol-body-bg {
 background-color: var(--lol-bg-primary);
}
</style>
