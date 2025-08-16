import { RiotApiManager } from "~/server/utils/RiotApiManager";
import championData from "~/data/champion.json";
import itemData from "~/data/item.json";

/**
 * 試合タイムライン取得API
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { matchId, matchData } = body;

    if (!matchId) {
      throw createError({
        statusCode: 400,
        statusMessage: "matchIdが必要です",
      });
    }

    const runtimeConfig = useRuntimeConfig();
    const apiKey = runtimeConfig.riotApiKey;

    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Riot API Keyが設定されていません",
      });
    }

    const riotApi = new RiotApiManager(apiKey);

    // タイムラインデータを取得
    const timelineData = await riotApi.getMatchTimeline(matchId);

    // イベントを整理・分析
    const events = analyzeTimelineEvents(timelineData, matchData);

    return {
      success: true,
      data: {
        timeline: timelineData,
        events: events,
      },
    };
  } catch (error: any) {
    console.error("タイムライン取得エラー:", error);

    if (error?.statusCode === 404) {
      throw createError({
        statusCode: 404,
        statusMessage: "試合データが見つかりません",
      });
    }

    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.message || "タイムライン取得に失敗しました",
    });
  }
});

/**
 * タイムラインイベントを分析・整理する
 */
function analyzeTimelineEvents(timelineData: any, matchData?: any) {
  const events: any[] = [];

  if (!timelineData?.info?.frames) {
    return events;
  }

  // 各フレームからイベントを抽出
  timelineData.info.frames.forEach((frame: any, frameIndex: number) => {
    if (!frame.events) return;

    frame.events.forEach((event: any) => {
      const analyzedEvent = analyzeEvent(event, frameIndex, matchData);
      if (analyzedEvent) {
        events.push(analyzedEvent);
      }
    });
  });

  // 時間順にソート
  events.sort((a, b) => a.timestamp - b.timestamp);

  return events;
}

/**
 * 個別イベントを分析
 */
function analyzeEvent(event: any, frameIndex: number, matchData?: any) {
  const timestamp = event.timestamp;
  const minutes = Math.floor(timestamp / 60000);
  const seconds = Math.floor((timestamp % 60000) / 1000);
  const timeString = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // 重要なイベントのみ抽出
  switch (event.type) {
    case "CHAMPION_KILL":
      const killerTeam = getTeamSide(event.killerId, matchData);
      const victimTeam = getTeamSide(event.victimId, matchData);
      return {
        type: "KILL",
        timestamp,
        timeString,
        frameIndex,
        description: `${killerTeam}の${getParticipantName(
          event.killerId,
          matchData
        )}が${victimTeam}の${getParticipantName(event.victimId, matchData)}をキル`,
        killerId: event.killerId,
        victimId: event.victimId,
        killerTeam: killerTeam,
        victimTeam: victimTeam,
        assistingParticipantIds: event.assistingParticipantIds || [],
        position: event.position,
        icon: "💀",
        priority: 5,
      };

    case "BUILDING_KILL":
      const buildingType = getBuildingType(event.buildingType);
      const attackerTeam = getTeamSide(event.killerId, matchData);
      return {
        type: "BUILDING",
        timestamp,
        timeString,
        frameIndex,
        description: `${attackerTeam}が${buildingType}を破壊`,
        buildingType: event.buildingType,
        teamId: event.teamId,
        killerId: event.killerId,
        attackerTeam: attackerTeam,
        icon: "🏗️",
        priority: 4,
      };

    case "ELITE_MONSTER_KILL":
      const monsterType = getMonsterType(event.monsterType);
      const teamSide = getTeamSide(event.killerId, matchData);
      return {
        type: "MONSTER",
        timestamp,
        timeString,
        frameIndex,
        description: `${teamSide}が${monsterType}を討伐`,
        monsterType: event.monsterType,
        killerId: event.killerId,
        teamSide: teamSide,
        icon: getMonsterIcon(event.monsterType),
        priority: 5,
      };

    case "TURRET_PLATE_DESTROYED":
      return {
        type: "PLATE",
        timestamp,
        timeString,
        frameIndex,
        description: "タワープレートが破壊された",
        killerId: event.killerId,
        laneType: event.laneType,
        icon: "🛡️",
        priority: 2,
      };

    case "ITEM_PURCHASED":
      // レジェンダリーアイテムのみ
      if (isLegendaryItem(event.itemId)) {
        const itemName = getItemName(event.itemId);
        const purchaserName = getParticipantName(event.participantId, matchData);
        const purchaserTeam = getTeamSide(event.participantId, matchData);
        
        return {
          type: "ITEM",
          timestamp,
          timeString,
          frameIndex,
          description: `${purchaserTeam}の${purchaserName}が${itemName}を購入`,
          itemId: event.itemId,
          itemName: itemName,
          participantId: event.participantId,
          purchaserName: purchaserName,
          purchaserTeam: purchaserTeam,
          icon: "🛒",
          priority: 3,
        };
      }
      return null;

    case "LEVEL_UP":
      // レベル6、11、16のみ
      if ([6, 11, 16].includes(event.level)) {
        return {
          type: "LEVEL",
          timestamp,
          timeString,
          frameIndex,
          description: `${getParticipantName(
            event.participantId,
            matchData
          )}がレベル${event.level}に到達`,
          level: event.level,
          participantId: event.participantId,
          icon: "⬆️",
          priority: 3,
        };
      }
      return null;

    default:
      return null;
  }
}

/**
 * 英語チャンピオン名を日本語に変換
 */
function getJapaneseChampionName(englishName: string): string {
  const champion =
    championData.data[englishName as keyof typeof championData.data];
  return champion?.name || englishName;
}

/**
 * 参加者のチャンピオン名取得
 */
function getParticipantName(participantId: number, matchData?: any): string {
  if (!matchData) {
    return `Player${participantId}`;
  }

  // myTeamとenemyTeamから参加者を結合
  const allParticipants = [];

  if (matchData.myTeam && Array.isArray(matchData.myTeam)) {
    allParticipants.push(...matchData.myTeam);
  }

  if (matchData.enemyTeam && Array.isArray(matchData.enemyTeam)) {
    allParticipants.push(...matchData.enemyTeam);
  }

  if (allParticipants.length > 0) {
    const participant = allParticipants.find(
      (p: any) => p.participantId === participantId
    );
    if (participant && participant.championName) {
      const japaneseChampionName = getJapaneseChampionName(
        participant.championName
      );
      return japaneseChampionName;
    }
  }

  return `Player${participantId}`;
}

/**
 * 建物タイプ取得
 */
function getBuildingType(buildingType: string): string {
  const types: { [key: string]: string } = {
    TOWER_BUILDING: "タワー",
    INHIBITOR_BUILDING: "インヒビター",
    NEXUS_BUILDING: "ネクサス",
  };
  return types[buildingType] || buildingType;
}

/**
 * モンスタータイプ取得
 */
function getMonsterType(monsterType: string): string {
  const types: { [key: string]: string } = {
    DRAGON: "ドラゴン",
    BARON_NASHOR: "バロン",
    RIFTHERALD: "リフトヘラルド",
    HORDE: "ヴォイドグラブ",
    ATAKHAN: "アタカン",
  };
  return types[monsterType] || monsterType;
}

/**
 * モンスターアイコン取得
 */
function getMonsterIcon(monsterType: string): string {
  const icons: { [key: string]: string } = {
    DRAGON: "🐉",
    BARON_NASHOR: "👑",
    RIFTHERALD: "👁️",
  };
  return icons[monsterType] || "👹";
}

/**
 * 参加者のチーム判定（自チーム: 1-5, 敵チーム: 6-10）
 */
function getTeamSide(participantId: number, matchData?: any): string {
  if (!matchData) {
    return participantId <= 5 ? "自チーム" : "敵チーム";
  }

  // myTeamから参加者を検索
  if (matchData.myTeam && Array.isArray(matchData.myTeam)) {
    const isMyTeam = matchData.myTeam.some((p: any) => p.participantId === participantId);
    if (isMyTeam) return "自チーム";
  }

  // enemyTeamから参加者を検索
  if (matchData.enemyTeam && Array.isArray(matchData.enemyTeam)) {
    const isEnemyTeam = matchData.enemyTeam.some((p: any) => p.participantId === participantId);
    if (isEnemyTeam) return "敵チーム";
  }

  // フォールバック: 一般的なLoLの参加者ID範囲で判定
  return participantId <= 5 ? "自チーム" : "敵チーム";
}

/**
 * レジェンダリーアイテム判定
 */
function isLegendaryItem(itemId: number): boolean {
  const item = itemData.data[itemId.toString() as keyof typeof itemData.data];
  if (!item) return false;
  
  // レジェンダリーアイテムの条件：
  // 1. 価格が2500ゴールド以上
  // 2. depth（クラフト段階）が3以上、または高価格（3000ゴールド以上）
  // 3. 購入可能なアイテム
  const itemWithDepth = item as any; // depthプロパティにアクセスするため
  return item.gold?.total >= 2500 && 
         item.gold?.purchasable && 
         (itemWithDepth.depth >= 3 || item.gold?.total >= 3000);
}

/**
 * アイテム名取得
 */
function getItemName(itemId: number): string {
  const item = itemData.data[itemId.toString() as keyof typeof itemData.data];
  return item?.name || `アイテム${itemId}`;
}
