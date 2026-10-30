<div align="center">
  <img src="docs/images/logo.png" width="88" alt="LinkTrim">

  # LinkTrim

  URLの不要な追跡・共有パラメータを取り除いてコピーするブラウザ拡張機能です。
</div>

## ダウンロード・インストール

| ブラウザ | インストール |
| --- | --- |
| **Chrome / Edge / Vivaldi** | **[Chrome版 v0.0.1（ZIP・手動インストール）](https://github.com/mayomayowyi/LinkTrim/releases/download/v0.0.1/LinkTrim-chrome-v0.0.1.zip)** |
| **Firefox** | **[Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/linktrim/)** |

[最新リリース](https://github.com/mayomayowyi/LinkTrim/releases/latest)

GitHubのZIPから手動インストールしたChrome系ブラウザ版は、自動更新されません。

## 主な機能

- URLの不要な追跡・共有パラメータを除去
- YouTubeの通常の再生リスト・Mixリストなどからも、リスト情報を除いた動画単体URLをコピー
- X・YouTubeの動画の再生位置付きURLをコピー
- Xのタイムラインから投稿を開かずにコピー
- コピー後に「OK」を表示し、一定時間後に消去

### 変換例

#### YouTube

```text
変換前: https://youtu.be/ABCDEFG1234?si=ABCDefg12h34IjkL
変換後: https://youtu.be/ABCDEFG1234

変換前（再生リスト内）: https://www.youtube.com/watch?v=ABCDEFG1234&list=PLexample123&index=3
変換後: https://www.youtube.com/watch?v=ABCDEFG1234

変換前（Mixリスト内）: https://www.youtube.com/watch?v=ABCDEFG1234&list=RDABCDEFG1234&start_radio=1
変換後: https://www.youtube.com/watch?v=ABCDEFG1234
```

#### X（旧Twitter）

```text
変換前: https://x.com/abc_1/status/2115970570861031564?a=a1bCDefGHIJKLmNOPq2&s=20
変換後: https://x.com/abc_1/status/2115970570861031564
```

閲覧中のURLは変更しません。処理はブラウザ内で行い、広告・アクセス解析・外部へのデータ送信はありません。

## 使い方

### ツールバーからコピー

拡張機能のLinkTrimアイコンをクリックすると、開いているページのURLをコピーできます。

リンクを右クリックして「単体URLをコピー」を選ぶと、リンク先のURLもコピーできます。

### X・YouTubeのページ内からコピー

XとYouTubeには、専用のコピーボタンが表示されます。

- **リンクアイコン**：投稿や動画の単体URLをコピー
- **時計アイコン**：動画の現在の再生位置付きURLをコピー

Xではタイムラインの投稿からも直接コピーできます。時計アイコンは動画付きの投稿に表示されます。

YouTubeでは、通常の再生リストやMixリストから再生している動画も、リスト情報を取り除いて**動画単体のURL**としてコピーできます。

![XとYouTubeのコピー操作](docs/images/copy-buttons.webp)

## Chrome / Edge / Vivaldiへの手動インストール（GitHub版）

1. [Chrome版ZIP](https://github.com/mayomayowyi/LinkTrim/releases/download/v0.0.1/LinkTrim-chrome-v0.0.1.zip)をダウンロードします。
2. ZIPを右クリックし、**「すべて展開」** を選びます。
3. アドレスバーに `chrome://extensions` と入力します。Vivaldiは `vivaldi://extensions` でも開けます。
4. 右上の **「デベロッパーモード」** をオンにします。
5. **「パッケージ化されていない拡張機能を読み込む」** を押し、展開したフォルダーを選びます。

フォルダーの直下に `manifest.json` があることを確認してください。ツールバーにアイコンを固定しておくと、すぐにコピーできます。

更新時は新しいZIPを展開して読み込み直してください。重複を避けるため、旧版は無効にします。

## Firefoxへのインストール

[Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/linktrim/)で **「Firefoxへ追加」** を押してください。

## ライセンス

[MIT License](LICENSE) — Copyright (c) 2026 MAYOI
