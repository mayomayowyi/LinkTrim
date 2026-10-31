<div align="center">
  <img src="docs/images/logo.png" width="88" alt="LinkTrim">

  # LinkTrim

  URLをコピーするとき、余分な追跡・共有パラメータを取り除くブラウザ拡張機能です。
</div>

## インストール

| ブラウザ | 配布ページ |
| --- | --- |
| Chrome / Edge / Vivaldi | [Chromeウェブストア](https://chromewebstore.google.com/detail/linktrim/mnfojcijmgbdhllgpieahejkhecblcnj) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/linktrim/) |

[GitHub Releases](https://github.com/mayomayowyi/LinkTrim/releases/latest)からZIPもダウンロードできます。Chrome版は `0.0.2`、Firefox版は `0.0.2.1` です。

## できること

- ツールバーから、開いているページのURLをコピー
- リンクの右クリックメニューから、リンク先を開かずにURLをコピー
- YouTubeの動画一覧・Shortsから動画単体のURLをコピー
- YouTubeの再生リスト・ミックスリストのURLを、動画単体とは別にコピー
- YouTube・X（旧Twitter）の動画の再生位置付きURLをコピー
- Xのタイムラインから投稿URLをコピー。`t.co` のリンクは元URLを確認できる場合に展開
- Amazon.co.jpの商品URLを `/dp/ASIN/` 形式に短縮

上記以外のサイトでも、ツールバーや右クリックメニューから一般的な追跡パラメータを取り除いてコピーできます。サイト固有のコピー機能は順次対応予定です。

### URLの変換例

赤い `-` がコピー前、緑の `+` がコピー後です。IDなどは架空の文字列を使用しています。

**YouTube：共有パラメータを削除**

```diff
- https://youtu.be/abcd12ef34g?si=abcd12ef34gh5678
+ https://youtu.be/abcd12ef34g
```

**X：投稿URLを整形**

```diff
- https://x.com/example/status/1234567890123456789?a=abcd12ef34&s=20
+ https://x.com/example/status/1234567890123456789
```

**Amazon：商品IDを残して短縮**

```diff
- https://www.amazon.co.jp/example-product/dp/B0AB12CD34/?_encoding=UTF8&pd_rd_w=abcd12ef34&ref_=sr_1_1
+ https://www.amazon.co.jp/dp/B0AB12CD34/
```

## 使い方

**ツールバー**：LinkTrimのアイコンをクリックすると、現在のページのURLをコピーします。

**右クリック**：リンク上で右クリックして「単体URLをコピー」を選ぶと、リンク先のURLをコピーします。ページを開く必要はありません。

**X・YouTube**：ページ内に専用のコピーボタンが表示されます。

- **リンクアイコン**：投稿・動画の単体URL
- **時計アイコン**：動画の現在の再生位置付きURL
- **リストアイコン（横線3本）**：再生リスト・ミックスリストだけのURL（YouTubeの一覧でリストを取得できる場合）

YouTubeの一覧では、サムネイルにカーソルを合わせるとボタンが表示されます。

| 投稿・動画ページ | YouTubeの一覧 |
| :---: | :---: |
| <img src="docs/images/copy-buttons.webp" alt="XとYouTubeのリンク・再生位置コピーボタン" width="480"> | <img src="docs/images/list-copy.webp" alt="YouTubeの単体URL・リストURLのコピーボタン" width="480"> |

**Amazon**：商品詳細ページや商品一覧にあるコピーボタンから、商品URLを短くコピーできます。

閲覧中のページやアドレスバーは変更しません。処理はブラウザ内で行い、広告・アクセス解析・外部へのデータ送信はありません。

## Chrome系ブラウザへの手動インストール

1. [最新リリース](https://github.com/mayomayowyi/LinkTrim/releases/latest)の **Assets** から、ファイル名に `chrome` を含むZIPをダウンロードして展開します。
2. アドレスバーから `chrome://extensions` を開き、デベロッパーモードを有効にします（Vivaldiは `vivaldi://extensions` でも可）。
3. 「パッケージ化されていない拡張機能を読み込む」で、`manifest.json` のあるフォルダーを選びます。

GitHubのZIPから手動インストールした版は自動更新されません。更新するときは新しいZIPを展開して読み込み直し、旧版を無効にしてください。

## 開発

共通のJavaScriptは `src/`、ブラウザ別の設定は `manifests/` にあります。ビルドに追加ライブラリは不要です。

```sh
npm test
python scripts/package.py
```

テストにはNode.js、ZIPの作成にはPython 3が必要です。生成したZIPは `dist/` に保存されます。ブラウザ上の表示を試す補助スクリプトは `tests/browser-*-smoke.py` にあります。

## ライセンス

[MIT License](LICENSE) — Copyright (c) 2026 MAYOI