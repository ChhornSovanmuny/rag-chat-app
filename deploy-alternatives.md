# 代替デプロイ環境ガイド

## 🚀 無料・低コストデプロイ環境の比較

### 1. **Vercel（最推奨）** ⭐⭐⭐⭐⭐
**コスト**: 無料プランあり
**特徴**:
- Next.js の開発元が提供
- 自動デプロイ（GitHub連携）
- エッジ関数対応
- 優れたパフォーマンス

**デプロイ手順**:
```bash
# Vercel CLI でデプロイ
npm i -g vercel
vercel login
vercel
```

### 2. **Netlify** ⭐⭐⭐⭐
**コスト**: 無料プランあり
**特徴**:
- 静的サイトホスティング
- フォーム処理機能
- 優れたCDN

**デプロイ手順**:
```bash
# Netlify CLI でデプロイ
npm install -g netlify-cli
netlify login
netlify deploy
```

### 3. **Railway** ⭐⭐⭐⭐
**コスト**: 無料プランあり（月$5クレジット）
**特徴**:
- 簡単なデプロイ
- データベース統合
- 自動スケーリング

**デプロイ手順**:
1. [Railway](https://railway.app) にアクセス
2. GitHub リポジトリを接続
3. 環境変数を設定
4. 自動デプロイ

### 4. **Render** ⭐⭐⭐
**コスト**: 無料プランあり
**特徴**:
- シンプルな設定
- 自動SSL
- カスタムドメイン対応

**デプロイ手順**:
1. [Render](https://render.com) にアクセス
2. "New Web Service" を選択
3. GitHub リポジトリを接続
4. 環境変数を設定

### 5. **GitHub Pages** ⭐⭐⭐
**コスト**: 完全無料
**特徴**:
- 静的サイトのみ
- GitHub との完全統合
- カスタムドメイン対応

**制限事項**:
- API ルートが使用できない
- サーバーサイド機能なし

## 💰 コスト比較

| プラットフォーム | 無料プラン | 有料プラン | 推奨度 |
|----------------|-----------|-----------|--------|
| Vercel | ✅ 月100GB | $20/月 | ⭐⭐⭐⭐⭐ |
| Netlify | ✅ 月100GB | $19/月 | ⭐⭐⭐⭐ |
| Railway | ✅ 月$5クレジット | $5/月から | ⭐⭐⭐⭐ |
| Render | ✅ 月750時間 | $7/月から | ⭐⭐⭐ |
| GitHub Pages | ✅ 完全無料 | - | ⭐⭐⭐ |

## 🔧 環境変数設定

### 共通で必要な環境変数
```
WEAVIATE_ENDPOINT=https://vsxexgqtsucalittzr3ara.c0.asia-southeast1.gcp.weaviate.cloud
WEAVIATE_API_KEY=WjUyWFNUbkRQUXVueWYwQV93S3NURE5kVXJhSlJwYTBUaWdvZ09yQlJwTENTSFFEN2FQMTlnQ1d6TjBZPV92MjAw
GOOGLE_CLOUD_PROJECT_ID=rag-demo-464201
VERTEX_AI_LOCATION=asia-northeast1
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
```

## 🚨 注意事項

### 1. **API ルートの制限**
- GitHub Pages: API ルート不可
- その他: API ルート対応

### 2. **ファイルサイズ制限**
- Vercel: 50MB（関数）
- Netlify: 10MB（関数）
- Railway: 制限なし
- Render: 制限なし

### 3. **実行時間制限**
- Vercel: 60秒（無料）
- Netlify: 10秒（無料）
- Railway: 制限なし
- Render: 制限なし

## 📋 推奨デプロイ手順

### 1. **Vercel（推奨）**
```bash
# 1. GitHub にプッシュ
git add .
git commit -m "Deploy to Vercel"
git push

# 2. Vercel でデプロイ
# https://vercel.com で GitHub リポジトリを接続
```

### 2. **Railway（代替）**
```bash
# 1. Railway にアクセス
# 2. GitHub リポジトリを接続
# 3. 環境変数を設定
# 4. 自動デプロイ
```

## 🔄 移行手順

### AWS Elastic Beanstalk から移行
1. **現在の環境変数をバックアップ**
2. **新しいプラットフォームを選択**
3. **環境変数を設定**
4. **デプロイテスト**
5. **DNS 設定を更新**

## 📞 サポート

各プラットフォームのサポート:
- **Vercel**: 優れたドキュメント、コミュニティ
- **Netlify**: 豊富なチュートリアル
- **Railway**: Discord コミュニティ
- **Render**: メールサポート
- **GitHub Pages**: GitHub コミュニティ 