/**
 * 試合後AI分析＆データ最適化コンポーザブル
 * 試合後のAI分析とダウンロード用の最適化されたデータを提供
 */

/**
 * 意味のある0値フィールド一覧（削除してはいけない0値）
 * ゲーム統計として重要な情報を含むフィールド
 */
const MEANINGFUL_ZERO_FIELDS = [
  // 基本ゲーム統計
  'kills', 'deaths', 'assists', 'win', 'lose',
  
  // オブジェクト関連
  'baronKills', 'dragonKills', 'elderDragonKills', 'inhibitorKills', 
  'nexusKills', 'turretKills', 'objectivesStolen', 'objectivesStolenAssists',
  
  // ダメージ統計
  'magicDamageDealt', 'physicalDamageDealt', 'trueDamageDealt',
  'magicDamageDealtToChampions', 'physicalDamageDealtToChampions', 'trueDamageDealtToChampions',
  'damageDealtToBuildings', 'damageDealtToTurrets', 'totalDamageDealt', 'totalDamageDealtToChampions',
  'totalDamageTaken', 'magicDamageTaken', 'physicalDamageTaken', 'trueDamageTaken',
  
  // 回復・シールド
  'totalHeal', 'totalHealsOnTeammates', 'totalDamageShieldedOnTeammates',
  
  // 視界・ワード
  'visionScore', 'wardsPlaced', 'wardsKilled', 'visionWardsBought', 'detectorWardsPlaced',
  
  // ゴールド・CS
  'goldEarned', 'goldSpent', 'totalMinionsKilled', 'neutralMinionsKilled',
  
  // キル関連詳細統計
  'doubleKills', 'tripleKills', 'quadraKills', 'pentaKills', 'killingSprees',
  'largestKillingSpree', 'largestMultiKill', 'longestTimeSpentLiving',
  
  // その他重要な統計
  'soloKills', 'teamObjective', 'firstBloodKill', 'firstBloodAssist',
  'firstTowerKill', 'firstTowerAssist', 'firstInhibitorKill', 'firstInhibitorAssist',
  
  // タイムライン関連
  'time', 'timestamp'
];

/**
 * フィールド名が意味のある0値として保持すべきかを判定
 * @param fieldName フィールド名
 * @returns 意味のある0値として保持すべきかどうか
 */
const isMeaningfulZeroField = (fieldName: string): boolean => {
  return MEANINGFUL_ZERO_FIELDS.some(meaningfulField => 
    fieldName.toLowerCase().includes(meaningfulField.toLowerCase()) ||
    meaningfulField.toLowerCase().includes(fieldName.toLowerCase())
  );
};

/**
 * オブジェクトから不要な0値を再帰的に削除
 * @param obj 処理対象のオブジェクト
 * @returns 不要な0値を削除したオブジェクト
 */
const removeUnnecessaryZeros = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUnnecessaryZeros).filter(item => item !== null && item !== undefined);
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        // 0値の場合、意味のある0値かどうかを判定
        if (value === 0) {
          if (isMeaningfulZeroField(key)) {
            // 意味のある0値は保持
            result[key] = value;
          }
          // 意味のない0値は削除（resultに追加しない）
        } else {
          // 0値以外は再帰的に処理して保持
          const cleanedValue = removeUnnecessaryZeros(value);
          if (cleanedValue !== null && cleanedValue !== undefined &&
              !(typeof cleanedValue === 'object' && Object.keys(cleanedValue).length === 0)) {
            result[key] = cleanedValue;
          }
        }
      }
    }
    return result;
  }
  return obj;
};

/**
 * プレイヤーデータを最適化（PlayerScore削除、challenges最適化、不要な0値削除）
 * @param player プレイヤーデータ
 * @returns 最適化されたプレイヤーデータ
 */
const optimizePlayerData = (player: any) => {
  let optimized = { ...player };
  
  // PlayerScore0-11フィールドを削除
  for (let i = 0; i <= 11; i++) {
    delete optimized[`PlayerScore${i}`];
  }
  
  // challengesフィールドを最適化（0値またはSWARM系を削除）
  if (optimized.challenges) {
    const filteredChallenges: any = {};
    Object.keys(optimized.challenges).forEach(key => {
      const value = optimized.challenges[key];
      // 0値でもなく、SWARM系でもない項目のみ残す
      if (value !== 0 && !key.startsWith('SWARM_')) {
        filteredChallenges[key] = value;
      }
    });
    optimized.challenges = filteredChallenges;
  }
  
  // 不要な0値を削除（意味のある0値は保持）
  optimized = removeUnnecessaryZeros(optimized);
  
  return optimized;
};

/**
 * 試合後AI分析＆データ最適化コンポーザブル
 */
export const usePostMatchAnalysis = () => {
  // 試合後AI分析の状態管理
  const isPostMatchAdviceGenerating = ref(false);
  const postMatchAdvice = ref<any>(null);
  let postMatchAdviceController: AbortController | null = null;

  /**
   * AI分析用の最適化されたデータを生成
   * @param matchData 元の試合データ
   * @returns 最適化されたAI分析用データ
   */
  const getOptimizedAIData = (matchData: any) => {
    if (!matchData) return null;

    // ベースデータを作成
    const baseData = {
      matchId: matchData.matchId,
      myChampionName: matchData.myParticipant?.championName,
      gameResult: matchData.myParticipant?.win ? "WIN" : "LOSE",
      gameInfo: matchData.gameInfo,
      myTeam: matchData.myTeam?.map(optimizePlayerData) || [],
      enemyTeam: matchData.enemyTeam?.map(optimizePlayerData) || [],
      myParticipant: matchData.myParticipant ? optimizePlayerData(matchData.myParticipant) : null,
      teamStats: matchData.teamStats,
      analysisSummary: matchData.analysisSummary,
      timelineEvents: matchData.timelineEvents || [],
    };
    
    // 全体に不要な0値削除を適用して最大限の最適化を実現
    return removeUnnecessaryZeros(baseData);
  };

  /**
   * 試合後AI分析を実行
   * @param matchData 試合データ
   * @param selectedAiModel 選択されたAIモデル
   */
  const generatePostMatchAdvice = async (matchData: any, selectedAiModel: string) => {
    if (!matchData) {
      throw new Error("試合データがないため、AI分析を実行できません");
    }
    if (isPostMatchAdviceGenerating.value) return;

    isPostMatchAdviceGenerating.value = true;
    postMatchAdvice.value = null;
    postMatchAdviceController = new AbortController();

    try {
      const response = (await $fetch("/api/advice/post-match", {
        method: "POST",
        body: {
          matchId: matchData.matchId,
          matchData: getOptimizedAIData(matchData),
          model: selectedAiModel,
        },
        signal: postMatchAdviceController.signal,
      })) as any;

      if (response.success && response.analysis) {
        postMatchAdvice.value = response.analysis;
      } else {
        throw new Error("AI分析の応答が不正です");
      }
    } finally {
      isPostMatchAdviceGenerating.value = false;
      postMatchAdviceController = null;
    }
  };

  /**
   * AI分析をキャンセル
   */
  const cancelPostMatchAdvice = () => {
    if (postMatchAdviceController) {
      postMatchAdviceController.abort();
      isPostMatchAdviceGenerating.value = false;
      postMatchAdviceController = null;
    }
  };

  /**
   * 最適化されたデータをJSONファイルとしてダウンロード
   * @param matchData 元の試合データ
   */
  const downloadOptimizedDataAsJson = (matchData: any) => {
    const aiInputData = getOptimizedAIData(matchData);
    if (!aiInputData) return;

    const jsonString = JSON.stringify(aiInputData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LoL_AI_input_debug_${aiInputData.matchId}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    // 状態
    isPostMatchAdviceGenerating: readonly(isPostMatchAdviceGenerating),
    postMatchAdvice: readonly(postMatchAdvice),
    
    // メソッド
    generatePostMatchAdvice,
    cancelPostMatchAdvice,
    getOptimizedAIData,
    downloadOptimizedDataAsJson,
    optimizePlayerData, // 必要に応じて個別にプレイヤーデータを最適化
  };
};