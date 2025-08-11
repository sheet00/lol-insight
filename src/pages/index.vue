<template>
  <div class="min-h-screen bg-white">
    <div class="container mx-auto px-4 py-16">
      <header class="text-center">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">
          LoL Insight
        </h1>
      </header>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/styles/main.css"

// メタ情報
useHead({
  title: 'LoL Insight',
  meta: [
    { 
      name: 'description', 
      content: 'League of Legends 分析ツール' 
    }
  ]
})
</script>