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
  const baseClass = "flex items-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const typeClass = props.buttonType === "primary" ? "btn-primary" : "btn-secondary";
  const sizeClass = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
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