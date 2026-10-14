# 動画ストレージの設定

## AWS S3

管理者権限で、ソウル (`ap-northeast-2`) に `smashsight-<一意な名前>` バケットを作成します。
Object Ownership は「バケット所有者の強制」（ACL無効）、パブリックアクセスのブロックは4項目すべて有効にします。
デフォルト暗号化は SSE-S3 を使います。公開用のバケットポリシーは不要です。

バケットの「アクセス許可 → CORS」に以下を設定し、本番オリジンを実際のURLに置き換えます。

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://YOUR-PRODUCTION-DOMAIN"],
    "AllowedMethods": ["POST", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

CORS はブラウザの通信許可です。オブジェクトの読み書きは署名で認可し、アプリが署名発行前にセッション・所有者を確認します。

## ローカル開発用IAMユーザー

専用IAMユーザーに次のポリシーだけを付与し、アクセスキーを `.env.local` に保存します。
バケット作成・CORS設定は管理者が行うため、アプリ用ユーザーには管理権限や削除権限を付与しません。
`smashsight-*` は実際のバケット名に絞り込んでも構いません。

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::smashsight-*/videos/*"
    }
  ]
}
```

HeadObject にも `s3:GetObject` が使われます。ListBucket は使わず、一覧はDBから取得します。
ListBucket 権限がない環境では存在しないオブジェクトの HEAD が403になる場合があります。完了APIはその場合も ready に更新しません。

```dotenv
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=smashsight-YOUR-UNIQUE-NAME
AWS_ACCESS_KEY_ID=YOUR-ACCESS-KEY
AWS_SECRET_ACCESS_KEY=YOUR-SECRET
S3_ENDPOINT=
S3_FORCE_PATH_STYLE=false
```

SDK既定の認証チェーンを使うため、環境変数の代わりにプロファイル等も利用できます。キーをブラウザへ渡すことはありません。

## LocalStackでのローカル検証

```sh
docker run --rm --name smashsight-s3 -p 4566:4566 -e SERVICES=s3 localstack/localstack:3.8
docker exec smashsight-s3 awslocal s3 mb s3://smashsight-local --region ap-northeast-2
```

上記CORS JSONを `cors.json` に保存して `{ "CORSRules": [...] }` で包み、コンテナへコピーして適用します。

```sh
docker cp cors.json smashsight-s3:/tmp/cors.json
docker exec smashsight-s3 awslocal s3api put-bucket-cors --bucket smashsight-local --cors-configuration file:///tmp/cors.json
```

```dotenv
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=smashsight-local
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_ENDPOINT=http://localhost:4566
S3_FORCE_PATH_STYLE=true
```

LocalStack は署名とPOSTポリシー条件を検証しないため、その強制と非公開性の確認は実S3で行います。
署名にホスト名が含まれるため、endpoint はNext.jsサーバーとブラウザの両方から到達できる同じURLにします。
Docker内部ホスト名のみではブラウザの直接アップロードは動作しません。

## 骨格表示のCORS

プレイヤーは動画取得前から `crossOrigin="anonymous"` を指定します。S3のGET応答（Range取得の206も含む）に実際の画面オリジンを許可する `Access-Control-Allow-Origin` が必要です。上記GET許可を適用してください。CookieはS3へ送りません。署名URLのクエリで認可します。
通常再生できてもCORS未設定ではcanvasの画素を読めません。読み込み失敗時はCORSなしの通常再生へ切り替え、骨格を無効にします。iPhone実機を別のHTTPSオリジンで検証する場合は、そのオリジンも追加してください。

## 動作確認

1. DBと認証の環境変数も設定し、`pnpm install`、`pnpm db:migrate`、`pnpm dev` を実行します。
2. 登録・ログインして `/videos` から100MiB以下の mp4 / mov を送信します。進捗、完了、一覧、詳細画面の再生を確認します。
3. 別ユーザーでログインし、先の動画IDで詳細を開くと404、完了APIも404になることを確認します。
4. 未ログインで両アップロードAPIへPOSTすると401、不正な形式・サイズ・キー指定は400になることを確認します。
5. POSTポリシーの Content-Type やサイズを書き換えるとストレージ側で拒否されること、送信前に complete を呼んでも ready にならないことを確認します。

POST / GET 署名は5分間有効です。GET URLは期限内にURLを知る人が利用できるため共有しないでください。
転送失敗や完了確認失敗の行は `uploading` のまま残り、一覧には「アップロード未完了」と表示されます。
この段階では削除・クリーンアップ・トランスコードは実装していません。mov / mp4でもコーデックによってブラウザ再生できない場合があります。

## 参照

- [AWS: POST policy の条件](https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html)
- [AWS: HeadObject の権限](https://docs.aws.amazon.com/AmazonS3/latest/API/API_HeadObject.html)
- [AWS: CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
