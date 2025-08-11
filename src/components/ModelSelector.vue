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

// 選択中のモデル（v-model 対応）
const selectedModel = computed({
  get: () => props.modelValue || availableModels[0] || 'google/gemini-2.5-flash',
  set: (value: string) => emit('update:modelValue', value)
})

// モデル変更時の処理
const onModelChange = () => {
  emit('change', selectedModel.value)
}

// 初期値設定（マウント時にデフォルト値をemit）
onMounted(() => {
  if (!props.modelValue && availableModels.length > 0) {
    const defaultModel = availableModels[0]
    if (defaultModel) {
      emit('update:modelValue', defaultModel)
    }
  }
})
</script>