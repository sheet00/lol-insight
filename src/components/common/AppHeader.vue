<!--
/**
 * AppHeader.vue - アプリケーション共通のグローバルヘッダー
 * 
 * 【機能・UI概要】
 * - LoL Teacherアプリのタイトル表示
 * - 検索フォーム（トップページのみ表示）
 * - ナビゲーションリンク（コスト管理など）
 * - ログアウト機能
 */
-->
<template>
  <header class="sticky top-0 z-50 w-full lol-header backdrop-blur">
    <div class="h-16 flex items-center justify-between gap-6 w-full px-6">
      <!-- 左側: タイトル -->
      <div class="flex-shrink-0">
        <NuxtLink to="/" class="flex items-center gap-2">
          <h1 class="lol-title text-xl leading-none">
            LoL Teacher
          </h1>
        </NuxtLink>
      </div>

      <!-- 中央と右側 -->
      <div class="flex items-center justify-end flex-grow gap-4">
        <!-- 中央: 検索フォーム（トップページのみ） -->
        <div class="flex-1 flex justify-center max-w-5xl">
          <SearchForm
            v-if="route.path === '/'"
            :search-form="searchForm"
            :selected-ai-model="selectedAiModel"
            :loading="loading"
            :is-advice-generating="isAdviceGenerating"
            :user-fetch-loading="userFetchLoading"
            @search="search"
            @model-change="onModelChange"
            @update:summoner-name="searchForm.summonerName = $event"
            @update:tag-line="searchForm.tagLine = $event"
            @fetch-featured-user="onFetchFeaturedUser"
          />
        </div>

        <!-- 右側: 共通アクション -->
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/admin/cost-logs"
            class="admin-link text-xs px-3 py-1 rounded-lg transition-all shadow-sm hover:shadow-md"
            style="background-color: var(--lol-gold); color: var(--lol-blue-1); font-weight: 600;"
            title="コストログ管理"
          >
            💰 コスト管理
          </NuxtLink>
          
          <button
            @click="handleLogout"
            class="logout-button flex items-center justify-center"
            title="ログアウト"
          >
            🚪
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useSearchStore } from '@/stores/search';
import { storeToRefs } from 'pinia';
import SearchForm from '~/components/common/SearchForm.vue';

const authStore = useAuthStore();
const searchStore = useSearchStore();
const route = useRoute();

// searchストアからstateとactionを取得
const { 
  searchForm, 
  selectedAiModel, 
  loading, 
  isAdviceGenerating, 
  userFetchLoading 
} = storeToRefs(searchStore);

const { 
  search, 
  onModelChange, 
  onFetchFeaturedUser 
} = searchStore;

// ログアウト処理
const handleLogout = async () => {
  await authStore.logout();
  await navigateTo('/login');
};
</script>

<style scoped>
.main-content-width {
  max-width: 1400px;
}
.lol-header {
  background-color: rgba(10, 15, 20, 0.8);
  border-bottom: 1px solid var(--lol-blue-5);
}
</style>
