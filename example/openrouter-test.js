/**
 * OpenRouter テスト用スクリプト
 * 生成AIに「あいさつして」とリクエストして、レスポンスを表示する
 */

const https = require('https');

// 環境変数から OpenRouter API キーを取得
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ エラー: OPENROUTER_API_KEY 環境変数が設定されていません');
  console.log('💡 設定方法: export OPENROUTER_API_KEY="your_api_key_here"');
  process.exit(1);
}

// リクエストデータ
const requestData = JSON.stringify({
  model: "openai/gpt-3.5-turbo", // 使用するモデル（変更可能）
  messages: [
    {
      role: "user",
      content: "あいさつして"
    }
  ],
  temperature: 0.7,
  max_tokens: 150
});

// HTTPSリクエストオプション
const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData),
    'HTTP-Referer': 'https://github.com/your-username/lol-teacher', // あなたのプロジェクトURL
    'X-Title': 'LoL Teacher - OpenRouter Test'
  }
};

console.log('🚀 OpenRouter APIテスト開始...');
console.log('📝 リクエスト内容: "あいさつして"');
console.log('🤖 使用モデル:', 'openai/gpt-3.5-turbo');
console.log('---');

// APIリクエスト実行
const req = https.request(options, (res) => {
  let data = '';

  // データ受信
  res.on('data', (chunk) => {
    data += chunk;
  });

  // レスポンス完了
  res.on('end', () => {
    console.log('✅ レスポンス受信成功！');
    console.log('📊 ステータスコード:', res.statusCode);
    console.log('🔍 レスポンスヘッダー:', JSON.stringify(res.headers, null, 2));
    console.log('---');
    console.log('📄 完全なレスポンス（未加工）:');
    console.log(data);
    console.log('---');
    
    try {
      const response = JSON.parse(data);
      console.log('📋 JSONパース済みレスポンス（整形表示）:');
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error('❌ JSONパースエラー:', error.message);
      console.log('⚠️  レスポンスがJSON形式ではありません');
    }
  });
});

// エラーハンドリング
req.on('error', (error) => {
  console.error('❌ リクエストエラー:', error.message);
});

// タイムアウト設定（30秒）
req.setTimeout(30000, () => {
  console.error('❌ タイムアウト: 30秒以内にレスポンスがありませんでした');
  req.destroy();
});

// リクエスト送信
req.write(requestData);
req.end();