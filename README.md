<div align="center">
  <img src="docs/images/logo.png" width="88" alt="LinkTrim">

  # LinkTrim

  不要な追跡・共有パラメータを取り除いて、URLをコピーするブラウザ拡張機能です。
</div>

## ダウンロード

| ブラウザ | ダウンロード |
| --- | --- |
| **Chrome / Edge / Vivaldi** | **[Chrome版 v0.0.1（ZIP）](https://github.com/mayomayowyi/LinkTrim/releases/download/v0.0.1/LinkTrim-chrome-v0.0.1.zip)** |
| **Firefox** | **[Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/linktrim/)** |

[最新版のリリースを確認](https://github.com/mayomayowyi/LinkTrim/releases/latest)

Chrome系ブラウザでは手動でインストールするため、自動更新されません。Firefox版はMozillaによる公開が完了してからインストールできます。

## 主な機能

- 現在のページやリンク先のURLから不要なパラメータを取り除いてコピー
- Xのタイムラインから投稿を開かずにURLをコピー
- YouTubeのMix・再生リスト情報を除いた動画単体URLをコピー
- X・YouTubeの動画を、再生位置付きURLとしてコピー
- X・YouTubeに小さなコピーボタンを追加

### 変換例

```text
変換前: https://youtu.be/ABCDEFG1234?si=ABCDefg12h34IjkL
変換後: https://youtu.be/ABCDEFG1234

変換前: https://x.com/abc_1/status/2115970570861031564?a=a1bCDefGHIJKLmNOPq2&s=20
変換後: https://x.com/abc_1/status/2115970570861031564
```

閲覧中のURLは変更しません。コピー処理はブラウザ内で行い、広告・アクセス解析・外部へのデータ送信はありません。

## Chrome / Edge / Vivaldiへのインストール

1. [Chrome版ZIP](https://github.com/mayomayowyi/LinkTrim/releases/download/v0.0.1/LinkTrim-chrome-v0.0.1.zip)をダウンロードします。
2. ZIPを右クリックして **「すべて展開」** を選びます。
3. ブラウザのアドレスバーに `chrome://extensions` と入力します。Vivaldiなら `vivaldi://extensions` でも開けます。
4. 右上の **「デベロッパーモード」** をオンにします。
5. **「パッケージ化されていない拡張機能を読み込む」** を選び、展開したフォルダーを指定します。
6. ツールバーの拡張機能メニューからLinkTrimを固定すると、アイコンをクリックしてURLをコピーできます。

フォルダー内に `manifest.json` があることを確認してください。ZIPファイルそのものは選択できません。

更新時は新しいZIPを展開して読み込み直します。旧版を有効にしたままだと右クリックメニューが重複するため、旧版は無効にしてください。

## Firefoxへのインストール

[Firefox Add-onsのLinkTrim](https://addons.mozilla.org/ja/firefox/addon/linktrim/)で **「Firefoxへ追加」** を選んでください。未署名のZIPを通常版Firefoxに直接インストールすることはできません。

## ソースコード

配布ZIP内のJavaScriptは圧縮・難読化していません。開発用ソースにはテストとパッケージ作成スクリプトも含まれます。

## ライセンス

[MIT License](LICENSE) — Copyright (c) 2026 MAYOI
