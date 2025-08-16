<template>
  <div v-if="advice" class="card mt-6">
    <div class="mb-6">
      <h3 class="text-xl font-semibold text-gray-900 flex items-center">
        <span class="mr-2">🤖</span>
        AI試合後分析結果
      </h3>
      <p class="text-gray-600 text-sm mt-1">
        生成AIによる詳細な試合振り返りとアドバイス
      </p>
    </div>

    <div class="space-y-6">
      <!-- ゲーム全体の総評 -->
      <div class="analysis-section">
        <h4 class="section-title">
          <span class="mr-2">📝</span>
          ゲーム全体の総評
        </h4>
        <div class="analysis-content">
          <div class="analysis-item">
            <h5 class="analysis-item-title">試合の流れ</h5>
            <p class="analysis-text">
              {{ advice["ゲーム全体の総評"]["試合の流れ"] }}
            </p>
          </div>
          <div class="analysis-item">
            <h5 class="analysis-item-title">勝敗要因</h5>
            <p class="analysis-text">
              {{ advice["ゲーム全体の総評"]["勝敗要因"] }}
            </p>
          </div>
          <div class="analysis-item">
            <h5 class="analysis-item-title">チーム貢献度</h5>
            <p class="analysis-text">
              {{ advice["ゲーム全体の総評"]["チーム貢献度"] }}
            </p>
          </div>
        </div>
      </div>

      <!-- 良かった点・悪かった点 -->
      <div class="analysis-section">
        <h4 class="section-title">
          <span class="mr-2">⚖️</span>
          良かった点・悪かった点
        </h4>
        <div class="analysis-content">
          <div class="analysis-item good-point">
            <h5 class="analysis-item-title text-green-700">
              <span class="mr-2">✅</span>
              ここが良かった
            </h5>
            <p class="analysis-text">
              {{ advice["良かった点・悪かった点"]["ここが良かった"] }}
            </p>
          </div>
          <div class="analysis-item bad-point">
            <h5 class="analysis-item-title text-red-700">
              <span class="mr-2">❌</span>
              ここが悪かった
            </h5>
            <p class="analysis-text">
              {{ advice["良かった点・悪かった点"]["ここが悪かった"] }}
            </p>
          </div>
          <div class="analysis-item">
            <h5 class="analysis-item-title text-blue-700">
              <span class="mr-2">📊</span>
              数値での評価
            </h5>
            <p class="analysis-text">
              {{ advice["良かった点・悪かった点"]["数値での評価"] }}
            </p>
          </div>
        </div>
      </div>

      <!-- ターニングポイント分析 -->
      <div class="analysis-section">
        <h4 class="section-title">
          <span class="mr-2">🔄</span>
          ターニングポイント分析
        </h4>
        <div class="analysis-content">
          <div class="analysis-item">
            <h5 class="analysis-item-title">試合の転換点</h5>
            <p class="analysis-text">
              {{ advice["ターニングポイント分析"]["試合の転換点"] }}
            </p>
          </div>
          <div class="analysis-item">
            <h5 class="analysis-item-title">重要な判断</h5>
            <p class="analysis-text">
              {{ advice["ターニングポイント分析"]["重要な判断"] }}
            </p>
          </div>
          <div class="analysis-item">
            <h5 class="analysis-item-title">もしもの選択</h5>
            <p class="analysis-text">
              {{ advice["ターニングポイント分析"]["もしもの選択"] }}
            </p>
          </div>
        </div>
      </div>

      <!-- 具体的改善アドバイス -->
      <div class="analysis-section">
        <h4 class="section-title">
          <span class="mr-2">💡</span>
          具体的改善アドバイス
        </h4>
        <div class="analysis-content">
          <div class="analysis-item improvement">
            <h5 class="analysis-item-title text-green-700">
              <span class="mr-2">🎯</span>
              こうするとよい
            </h5>
            <p class="analysis-text">
              {{ advice["具体的改善アドバイス"]["こうするとよい"] }}
            </p>
          </div>
          <div class="analysis-item">
            <h5 class="analysis-item-title text-orange-700">
              <span class="mr-2">⚠️</span>
              気をつける点
            </h5>
            <p class="analysis-text">
              {{ advice["具体的改善アドバイス"]["気をつける点"] }}
            </p>
          </div>
          <div class="analysis-item">
            <h5 class="analysis-item-title text-purple-700">
              <span class="mr-2">🧠</span>
              戦術的提案
            </h5>
            <p class="analysis-text">
              {{ advice["具体的改善アドバイス"]["戦術的提案"] }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import "@/assets/styles/components/PostMatchAnalysis.css";
// Props
interface Props {
  advice: any | null;
}

const props = defineProps<Props>();
</script>
