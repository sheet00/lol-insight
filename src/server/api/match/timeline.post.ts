import { RiotApiManager } from "~/server/utils/RiotApiManager";
import championData from "~/data/champion.json";

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
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // 重要なイベントのみ抽出
  switch (event.type) {
    case 'CHAMPION_KILL':
      return {
        type: 'KILL',
        timestamp,
        timeString,
        frameIndex,
        description: `${getParticipantName(event.killerId, matchData)} が ${getParticipantName(event.victimId, matchData)} をキル`,
        killerId: event.killerId,
        victimId: event.victimId,
        assistingParticipantIds: event.assistingParticipantIds || [],
        position: event.position,
        icon: '💀',
        priority: 5
      };

    case 'BUILDING_KILL':
      const buildingType = getBuildingType(event.buildingType);
      return {
        type: 'BUILDING',
        timestamp,
        timeString,
        frameIndex,
        description: `${buildingType}が破壊された`,
        buildingType: event.buildingType,
        teamId: event.teamId,
        killerId: event.killerId,
        icon: '🏗️',
        priority: 4
      };

    case 'ELITE_MONSTER_KILL':
      const monsterType = getMonsterType(event.monsterType);
      return {
        type: 'MONSTER',
        timestamp,
        timeString,
        frameIndex,
        description: `${monsterType}が討伐された`,
        monsterType: event.monsterType,
        killerId: event.killerId,
        icon: getMonsterIcon(event.monsterType),
        priority: 5
      };

    case 'TURRET_PLATE_DESTROYED':
      return {
        type: 'PLATE',
        timestamp,
        timeString,
        frameIndex,
        description: 'タワープレートが破壊された',
        killerId: event.killerId,
        laneType: event.laneType,
        icon: '🛡️',
        priority: 2
      };

    case 'ITEM_PURCHASED':
      // 重要アイテムのみ
      if (isImportantItem(event.itemId)) {
        return {
          type: 'ITEM',
          timestamp,
          timeString,
          frameIndex,
          description: `重要アイテムを購入`,
          itemId: event.itemId,
          participantId: event.participantId,
          icon: '🛒',
          priority: 1
        };
      }
      return null;

    case 'LEVEL_UP':
      // レベル6、11、16のみ
      if ([6, 11, 16].includes(event.level)) {
        return {
          type: 'LEVEL',
          timestamp,
          timeString,
          frameIndex,
          description: `${getParticipantName(event.participantId, matchData)}がレベル${event.level}に到達`,
          level: event.level,
          participantId: event.participantId,
          icon: '⬆️',
          priority: 3
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
  const champion = championData.data[englishName as keyof typeof championData.data];
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
    const participant = allParticipants.find((p: any) => p.participantId === participantId);
    if (participant && participant.championName) {
      const japaneseChampionName = getJapaneseChampionName(participant.championName);
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
    'TOWER_BUILDING': 'タワー',
    'INHIBITOR_BUILDING': 'インヒビター',
    'NEXUS_BUILDING': 'ネクサス'
  };
  return types[buildingType] || buildingType;
}

/**
 * モンスタータイプ取得
 */
function getMonsterType(monsterType: string): string {
  const types: { [key: string]: string } = {
    'DRAGON': 'ドラゴン',
    'BARON_NASHOR': 'バロン',
    'RIFTHERALD': 'リフトヘラルド'
  };
  return types[monsterType] || monsterType;
}

/**
 * モンスターアイコン取得
 */
function getMonsterIcon(monsterType: string): string {
  const icons: { [key: string]: string } = {
    'DRAGON': '🐉',
    'BARON_NASHOR': '👑',
    'RIFTHERALD': '👁️'
  };
  return icons[monsterType] || '👹';
}

/**
 * 重要アイテム判定
 */
function isImportantItem(itemId: number): boolean {
  // 主要なアイテムIDを設定（例：ミシック、レジェンダリーアイテムなど）
  const importantItems = [
    // ミシックアイテム例
    6632, 6633, 6691, 6692, 6693,
    // レジェンダリーアイテム例  
    3031, 3153, 3142, 3075
  ];
  return importantItems.includes(itemId);
}