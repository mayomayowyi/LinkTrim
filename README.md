# LinkTrim

URLをコピーするとき、不要な追跡・共有パラメータを取り除くブラウザ拡張機能です。  
閲覧中のページやアドレスバーのURLは変更しません。

## インストール

- [Chrome ウェブストア](https://chromewebstore.google.com/detail/linktrim/mnfojcijmgbdhllgpieahejkhecblcnj)（Chrome・Edge・Vivaldi・Braveなど）
- [Firefox Add-ons](https://addons.mozilla.org/ja/firefox/addon/linktrim/)
- [GitHubからダウンロード](https://github.com/mayomayowyi/LinkTrim/releases/latest)

Chrome版は **v0.0.2**、Firefox版は **v0.0.2.1** です。

## 使い方

- **拡張機能のアイコン**：開いているページのURLをコピー
- **右クリック**：リンク先のページを開かずにURLをコピー
- **YouTube**：動画・Shorts・一覧からのコピー、再生リスト単体や再生位置付きURLのコピー
- **X**：タイムラインの投稿URLや、動画の再生位置付きURLのコピー
- **Amazon.co.jp**：商品URLの短縮、商品詳細ページ・一覧でのコピー
- **Wikipedia**：記事名の横や、記事リンクからのコピー

### ページ内のコピーボタン

X・YouTubeでは、投稿や動画の近くにコピー用のボタンが表示されます。

![X・YouTubeのコピーボタン](docs/images/copy-buttons.webp)

YouTubeの動画一覧では、サムネイルにカーソルを合わせるとコピー用のボタンが表示されます。

![YouTubeの動画一覧に表示されるコピーボタン](docs/images/list-copy.webp)

上記以外のサイトでも、ツールバーや右クリックから一般的な追跡パラメータを取り除いてコピーできます。

## URLの変換例

以下のURLやIDは説明用の架空のものです。

### X

```text
https://x.com/example/status/0000000000000000000?a=EXAMPLE1234567890&s=20
↓
https://x.com/example/status/0000000000000000000
```

### Amazon.co.jp

```text
https://www.amazon.co.jp/sample-usb-wifi-adapter-600Mbps-
wireless-network-mini-size/dp/B0EXAMPLE0/?_encoding=UTF8&pd_rd_w=EXAMPLE
&content-id=amzn1.sym.00000000-0000-0000-0000-000000000000
&pf_rd_p=00000000-0000-0000-0000-000000000000&pf_rd_r=EXAMPLE0123456789
&pd_rd_wg=EXAMPLE&pd_rd_r=00000000-0000-0000-0000-000000000000
&ref_=pd_hp_d_r_atf_dealz_atf_cs
↓
https://www.amazon.co.jp/dp/B0EXAMPLE0/
```

### YouTube

```text
https://youtu.be/EXAMPLE0000?si=EXAMPLE1234567890
↓
https://youtu.be/EXAMPLE0000
```

## ZIPからインストールする場合（Chrome系）

1. [最新リリース](https://github.com/mayomayowyi/LinkTrim/releases/latest)からChrome版ZIPをダウンロードして展開します。
2. `chrome://extensions` を開き、デベロッパーモードを有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」から、`manifest.json` のあるフォルダーを選びます。

手動インストール版は自動更新されません。  
更新するときは新しいZIPを読み込み、旧版を無効にしてください。

## プライバシー・ライセンス

URLの整形はブラウザ内で行い、開発者へのURL送信やアクセス解析は行いません。  
詳しくは[プライバシーポリシー](PRIVACY.md)を参照してください。

[MIT License](LICENSE) — Copyright (c) 2026 MAYOI
