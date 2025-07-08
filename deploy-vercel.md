# Vercel デプロイガイド

## 🚀 Vercel へのデプロイ手順

### 1. 前提条件
- GitHub アカウント
- Vercel アカウント（GitHub でサインアップ可能）

### 2. プロジェクトを GitHub にプッシュ
```bash
# GitHub リポジトリを作成
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/rag-chat-app.git
git push -u origin main
```

### 3. Vercel でデプロイ
1. [Vercel](https://vercel.com) にアクセス
2. "New Project" をクリック
3. GitHub リポジトリを選択
4. プロジェクト設定を確認

### 4. 環境変数の設定
Vercel ダッシュボードで以下の環境変数を設定：

```
WEAVIATE_ENDPOINT=https://vsxexgqtsucalittzr3ara.c0.asia-southeast1.gcp.weaviate.cloud
WEAVIATE_API_KEY=WjUyWFNUbkRQUXVueWYwQV93S3NURE5kVXJhSlJwYTBUaWdvZ09yQlJwTENTSFFEN2FQMTlnQ1d6TjBZPV92MjAw
GOOGLE_CLOUD_PROJECT_ID=rag-demo-464201
VERTEX_AI_LOCATION=asia-northeast1
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account","project_id":"rag-demo-464201",...}
```

### 5. Google Cloud 認証の設定
Google Cloud サービスアカウントキーを環境変数として設定：

1. `credentials/rag-demo-464201-2652b5abbf08.json` の内容をコピー
2. Vercel の環境変数 `GOOGLE_APPLICATION_CREDENTIALS` に貼り付け

### 6. デプロイ実行
- "Deploy" ボタンをクリック
- 数分でデプロイ完了

## 💰 コスト
- **無料プラン**: 月100GB 帯域幅、無制限の個人プロジェクト
- **Pro プラン**: $20/月（チーム機能、カスタムドメイン等）

## 🔧 トラブルシューティング

### よくある問題
1. **環境変数が読み込まれない**
   - Vercel ダッシュボードで環境変数を再確認
   - デプロイ後に再デプロイ

2. **Google Cloud 認証エラー**
   - サービスアカウントキーが正しく設定されているか確認
   - JSON 形式が正しいか確認

3. **Weaviate 接続エラー**
   - エンドポイントとAPIキーを確認
   - ネットワーク接続を確認

## 📈 パフォーマンス最適化
- Vercel の Edge Functions を活用
- 画像の最適化
- コード分割の活用 