<!--
/**
 * TeamObjectiveStats.vue - チーム成績・オブジェクト統計表示コンポーネント
 * 
 * 【使用場所】
 * - components/completed_match/CompletedMatch.vue（完了試合詳細内）
 * 
 * 【機能・UI概要】
 * - 試合における両チームの総合統計情報表示
 * - チーム総キル数、総デス数、総アシスト数
 * - 主要オブジェクト制圧状況（ドラゴン、バロン、タワー、インヒビター等）
 * - 両チーム比較形式でのデータ表示
 * - 勝利チームと敗北チームの成績差を視覚的に表現
 * - 戦略的重要度の高いオブジェクト情報の強調表示
 */
-->
<template>
  <div class="card">
    <div class="mb-6">
      <h3 class="heading-md flex items-center">
        <span class="mr-2">📊</span>
        チーム成績・オブジェクト情報
      </h3>
      <p class="text-secondary text-sm mt-1">
        この試合でのチーム成績とオブジェクト制圧状況
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 自チーム -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-semibold text-blue-600">自チーム</h4>
          <div
            :class="
              teamStats.myTeam.win
                ? 'team-result-badge win'
                : 'team-result-badge loss'
            "
          >
            {{ teamStats.myTeam.win ? '勝利' : '敗北' }}
          </div>
        </div>

        <!-- オブジェクト統計 -->
        <div class="bg-blue-900 rounded-lg p-4">
          <h5 class="font-semibold text-blue-300 mb-3">オブジェクト制圧</h5>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">👑</span>キル数
              </span>
              <span class="font-semibold text-blue-600">
                {{ teamStats.myTeam.objectives.champion.kills }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🏰</span>タワー
              </span>
              <span class="font-semibold text-blue-600 flex items-center">
                {{ teamStats.myTeam.objectives.tower.kills }}
                <span v-if="teamStats.myTeam.objectives.tower.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🐉</span>ドラゴン
              </span>
              <span class="font-semibold text-blue-600 flex items-center">
                {{ teamStats.myTeam.objectives.dragon.kills }}
                <span v-if="teamStats.myTeam.objectives.dragon.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">👹</span>バロン
              </span>
              <span class="font-semibold text-blue-600 flex items-center">
                {{ teamStats.myTeam.objectives.baron.kills }}
                <span v-if="teamStats.myTeam.objectives.baron.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🦅</span>ヘラルド
              </span>
              <span class="font-semibold text-blue-600 flex items-center">
                {{ teamStats.myTeam.objectives.riftHerald.kills }}
                <span v-if="teamStats.myTeam.objectives.riftHerald.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🚪</span>インヒビター
              </span>
              <span class="font-semibold text-blue-600">
                {{ teamStats.myTeam.objectives.inhibitor.kills }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">💰</span>トータルゴールド
              </span>
              <span class="font-semibold text-blue-600">
                {{ formatGold(teamStats.myTeam.totalGold) }}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- 敵チーム -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-lg font-semibold text-red-600">敵チーム</h4>
          <div
            :class="
              teamStats.enemyTeam.win
                ? 'team-result-badge win'
                : 'team-result-badge loss'
            "
          >
            {{ teamStats.enemyTeam.win ? '勝利' : '敗北' }}
          </div>
        </div>

        <!-- オブジェクト統計 -->
        <div class="bg-red-900 rounded-lg p-4">
          <h5 class="font-semibold text-red-800 mb-3">オブジェクト制圧</h5>
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">👑</span>キル数
              </span>
              <span class="font-semibold text-red-600">
                {{ teamStats.enemyTeam.objectives.champion.kills }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🏰</span>タワー
              </span>
              <span class="font-semibold text-red-600 flex items-center">
                {{ teamStats.enemyTeam.objectives.tower.kills }}
                <span v-if="teamStats.enemyTeam.objectives.tower.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🐉</span>ドラゴン
              </span>
              <span class="font-semibold text-red-600 flex items-center">
                {{ teamStats.enemyTeam.objectives.dragon.kills }}
                <span v-if="teamStats.enemyTeam.objectives.dragon.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">👹</span>バロン
              </span>
              <span class="font-semibold text-red-600 flex items-center">
                {{ teamStats.enemyTeam.objectives.baron.kills }}
                <span v-if="teamStats.enemyTeam.objectives.baron.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🦅</span>ヘラルド
              </span>
              <span class="font-semibold text-red-600 flex items-center">
                {{ teamStats.enemyTeam.objectives.riftHerald.kills }}
                <span v-if="teamStats.enemyTeam.objectives.riftHerald.first" class="first-badge">First</span>
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">🚪</span>インヒビター
              </span>
              <span class="font-semibold text-red-600">
                {{ teamStats.enemyTeam.objectives.inhibitor.kills }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-700 flex items-center">
                <span class="mr-2">💰</span>トータルゴールド
              </span>
              <span class="font-semibold text-red-600">
                {{ formatGold(teamStats.enemyTeam.totalGold) }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 試合サマリー -->
    <div class="mt-6 pt-6 border-t border-gray-200">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
        <div>
          <div class="text-lg font-bold text-gray-900">
            {{ teamStats.myTeam.objectives.champion.kills }} vs {{ teamStats.enemyTeam.objectives.champion.kills }}
          </div>
          <div class="text-sm text-gray-600">総キル</div>
        </div>
        <div>
          <div class="text-lg font-bold text-gray-900">
            {{ teamStats.myTeam.objectives.tower.kills }} vs {{ teamStats.enemyTeam.objectives.tower.kills }}
          </div>
          <div class="text-sm text-gray-600">タワー破壊</div>
        </div>
        <div>
          <div class="text-lg font-bold text-gray-900">
            {{ teamStats.myTeam.objectives.dragon.kills }} vs {{ teamStats.enemyTeam.objectives.dragon.kills }}
          </div>
          <div class="text-sm text-gray-600">ドラゴン</div>
        </div>
        <div>
          <div class="text-lg font-bold text-gray-900">
            {{ formatGold(teamStats.myTeam.totalGold) }} vs {{ formatGold(teamStats.enemyTeam.totalGold) }}
          </div>
          <div class="text-sm text-gray-600">トータルゴールド</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TeamStats } from '~/types'
import '@/assets/styles/components/TeamObjectiveStats.css'

interface Props {
  teamStats: TeamStats
  getChampionName: (id: number) => string
}

const props = defineProps<Props>()

// ゴールドを3桁区切りでフォーマット（例：45,200）
const formatGold = (gold: number): string => {
  return gold.toLocaleString()
}
</script>