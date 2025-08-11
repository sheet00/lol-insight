#!/bin/bash

# Docker Compose 再起動スクリプト
# LoL Insight アプリケーションを完全に再起動する

echo "🐳 Docker Compose を停止中..."
docker compose down --timeout 1

echo "🚀 Docker Compose を起動中..."
docker compose up -d

echo "✅ Docker Compose の再起動が完了しました！"
echo "📖 ログを確認する場合: docker compose logs app --follow"
echo "🌐 アクセス: http://localhost:3000"