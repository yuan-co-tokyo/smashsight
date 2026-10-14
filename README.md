# smashsight

テニスのプレーを動画で振り返る分析Webアプリ。

## 開発環境

- Node.js 20.9 以上
- pnpm
- Next.js 16.2.10 (App Router) / React 19.2.4 / TypeScript / Tailwind CSS v4 / ESLint

## 開発手順

`.env.example` を `.env.local` にコピーし、次を設定します（秘密値はコミットしません）。

- `DATABASE_URL`: Neon（シンガポール、pooled接続・sslmode=verify-full） の PostgreSQL 接続URL
- `BETTER_AUTH_SECRET`: `openssl rand -base64 32` などで生成した秘密値
- `BETTER_AUTH_URL`: ローカルでは `http://localhost:3000`、本番では公開 HTTPS URL
- `INVITE_CODE`: 登録者に共有する招待コード。未設定・空の場合は登録を拒否します。

```sh
pnpm install
pnpm db:migrate
pnpm dev
```

http://localhost:3000 を開いて確認します。

`db:migrate` は接続先DBへマイグレーションを適用します。新規プロジェクト用の接続先を確認して実行してください。
`pnpm db:generate` はDBに接続せずSQLを生成します。認証設定のスキーマを再生成する場合は `pnpm auth:schema` を実行し、差分を確認してから `pnpm db:generate` を実行します。

## 認証の確認

1. 未ログインで `/` または `/videos` を開き、`/login` に移動することを確認します。
2. `/register` で表示名・メール・8〜128文字のパスワード・招待コードを入力します。不正なコードでは登録できず、正しいコードで登録すると `/videos` に表示名が出ます。
3. ログアウト後に `/videos` に戻れないこと、登録済みのメールとパスワードで再ログインできることを確認します。
4. `INVITE_CODE` を空にしてサーバーを再起動し、新規登録が拒否されることを確認します。既存ユーザーのログインは可能です。

招待コードはサーバーの登録前フックで照合し、DBには保存しません。`/videos` は Proxy の Cookie 存在確認に加え、Server Component でDBセッションを検証します。

## 検証・本番ビルド

```sh
pnpm lint
pnpm test
npx tsc --noEmit
pnpm build
```

ビルド後は `pnpm start` で本番サーバーを起動できます。

## 動画アップロード

S3設定とLocalStackを使ったローカル検証は [docs/aws-setup.md](docs/aws-setup.md) を参照してください。
`.env.local` にストレージ変数を設定し、`pnpm db:migrate` で動画テーブルを追加します。
`/videos` から mp4 / mov（100MiB以下）を直接アップロードし、自分の動画を一覧・再生できます。
再生時間の制限は設けていません。骨格表示はブラウザ内のみで処理し、結果は保存しません。

骨格表示の資産準備・ブラウザ確認・iOSの制約は [docs/pose-display.md](docs/pose-display.md) を参照してください。

お手本と自分の動画を選ぶ `/compare` の同期再生・基準点・左右反転については [docs/compare.md](docs/compare.md) を参照してください。
