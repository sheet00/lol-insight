<template>
  <!-- 帯状ヘッダ（トップの余白0） -->
  <header class="sticky top-0 z-50 w-full lol-header backdrop-blur">
    <div class="mx-auto main-content-width px-6">
      <div class="h-16 flex items-center justify-between gap-6">
        <div class="min-w-0">
          <h1 class="lol-title text-xl leading-none">
            LoL Teacher
          </h1>
          <p class="hidden sm:block text-xs text-gray-300 truncate">
            最新試合のマッチアップを分析
          </p>
        </div>

        <!-- 検索フォーム・AIモデル選択（ヘッダ内・コンパクト） -->
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center spacing-md w-full sm:w-auto max-w-5xl"
        >
          <!-- AIモデル選択 -->
          <ModelSelector
            :model-value="selectedAiModel"
            class="compact"
            @change="$emit('modelChange', $event)"
          />

          <!-- 検索フォーム -->
          <form
            @submit.prevent="$emit('search')"
            class="flex items-center spacing-md w-full sm:w-auto"
          >
            <input
              :value="searchForm.summonerName"
              @input="
                $emit(
                  'update:summonerName',
                  ($event.target as HTMLInputElement)?.value || ''
                )
              "
              type="text"
              required
              class="flex-1 min-w-52 px-4 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
              placeholder="ゲーム名"
            />
            <input
              :value="searchForm.tagLine"
              @input="
                $emit(
                  'update:tagLine',
                  ($event.target as HTMLInputElement)?.value || ''
                )
              "
              type="text"
              required
              class="w-24 px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
              placeholder="JP1"
            />
            <button
              type="submit"
              :disabled="loading"
              class="btn btn-primary btn-sm h-10 flex items-center justify-center whitespace-nowrap"
            >
              <span
                v-if="loading"
                class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
              ></span>
              {{ loading ? "分析中..." : "マッチ分析" }}
            </button>
            <button
              type="button"
              :disabled="loading || isAdviceGenerating || userFetchLoading"
              @click="$emit('fetchFeaturedUser')"
              class="btn btn-secondary btn-sm h-10 whitespace-nowrap flex items-center spacing-sm"
              title="/lol/spectator/v5/featured-games から試合中ユーザーを取得して入力欄にセット"
            >
              <span
                v-if="userFetchLoading"
                class="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"
              ></span>
              {{ userFetchLoading ? "検索中..." : "試合中ユーザー取得" }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import ModelSelector from "~/components/common/ModelSelector.vue";
import "@/assets/styles/components/SearchHeader.css";

// Props
interface Props {
  searchForm: {
    summonerName: string;
    tagLine: string;
  };
  selectedAiModel: string;
  loading: boolean;
  isAdviceGenerating: boolean;
  userFetchLoading: boolean;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  search: [];
  modelChange: [model: string];
  "update:summonerName": [value: string];
  "update:tagLine": [value: string];
  fetchFeaturedUser: [];
}>();
</script>
