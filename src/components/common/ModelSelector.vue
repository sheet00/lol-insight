<!--
/**
 * ModelSelector.vue - AI分析モデル選択ドロップダウンコンポーネント
 * 
 * 【使用場所】
 * - components/common/SearchHeader.vue（ヘッダー右側）
 * 
 * 【機能・UI概要】
 * - 利用可能なAIモデル一覧をドロップダウンで表示
 * - ユーザーがGemini、GPT、Claude等から選択可能
 * - 選択されたモデルを親コンポーネントに通知
 * - AI分析（試合前アドバイス・試合後分析）で使用モデル切り替え
 * - 環境変数で設定された利用可能モデルリストを表示
 */
-->
<template>
  <div class="model-selector">
    <label for="ai-model-select" class="model-selector-label">
      AIモデル選択
    </label>
    <select 
      id="ai-model-select"
      v-model="selectedModel"
      class="model-selector-dropdown"
      @change="onModelChange"
      @input="onModelChange"
    >
      <option v-for="model in availableModels" :key="model" :value="model">
        {{ model }}
      </option>
    </select>
  </div>
</template>

<script setup lang="ts">
import "@/assets/styles/components/ModelSelector.css"

// Props と Emits の定義
interface Props {
  modelValue?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: ''
})

const emit = defineEmits<Emits>()

// Runtime Config から利用可能なモデル一覧を取得
const config = useRuntimeConfig()
const availableModels = config.public.availableAiModels as string[]

// 単純なref（computedを使わない）
const selectedModel = ref(props.modelValue || availableModels[0] || '')

// propsが変更されたら内部状態も更新
watch(() => props.modelValue, (newValue) => {
  if (newValue && newValue !== selectedModel.value) {
    selectedModel.value = newValue
  }
})

// モデル変更時の処理
const onModelChange = () => {
  emit('update:modelValue', selectedModel.value)
  emit('change', selectedModel.value)
}

// 初期値設定（マウント時にデフォルト値をemit）
onMounted(() => {
  if (selectedModel.value) {
    emit('update:modelValue', selectedModel.value)
  }
})
</script>