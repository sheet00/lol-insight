<template>
  <button
    :class="buttonClass"
    :disabled="isGenerating"
    @click="$emit('generateAnalysis')"
    :title="title"
  >
    <span v-if="!isGenerating">🤖</span>
    <div
      v-else
      class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
    ></div>
    {{ buttonText }}
  </button>
</template>

<script setup lang="ts">
import "@/assets/styles/components/AIAnalysisButton.css";

// Props
interface Props {
  isGenerating: boolean;
  hasAnalysis?: boolean;
  buttonType?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  analysisType?: "live" | "post-match";
}

const props = withDefaults(defineProps<Props>(), {
  hasAnalysis: false,
  buttonType: "primary",
  size: "sm",
  analysisType: "live",
});

// Emits
defineEmits<{
  generateAnalysis: [];
}>();

// 計算プロパティ
const buttonText = computed(() => {
  if (props.isGenerating) {
    return "アドバイス生成中…";
  }
  return props.hasAnalysis ? "アドバイス再生成" : "アドバイス生成";
});

const buttonClass = computed(() => {
  const baseClass = "btn flex items-center spacing-sm";
  const typeClass = props.buttonType === "primary" ? "btn-gaming" : "btn-secondary";
  const sizeClass = {
    sm: "btn-sm",
    md: "btn-md", 
    lg: "btn-lg"
  }[props.size];
  
  return `${baseClass} ${typeClass} ${sizeClass}`;
});

const title = computed(() => {
  if (props.analysisType === "live") {
    return "AI が試合前のマッチアップ分析とアドバイスを生成します";
  } else {
    return "AI が試合後の詳細分析とアドバイスを生成します";
  }
});
</script>