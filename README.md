# 原宿サウンドマップ

原宿の簡略地図上にワークショップで録音した音を配置し、ピンをタップするとループ再生のオン/オフができる静的サイトです。
ビルド不要（HTML / CSS / JS / JSON / SVG のみ）。iPad Safari と PC Chrome で動作します。

## 使い方
1. `sounds/` に WAV ファイルを入れる（サンプラーで書き出したもの）。
2. `sounds.json` の `pins` にピンを書く。`x`,`y` は地図画像に対する比率（0〜1）。
3. ブラウザで開く。ローカルで試す場合は簡易サーバー経由（例: `npx serve .`）。fetch を使うため file:// では動きません。
4. START をタップ → ピンをタップで再生/停止。

## ピンの配置を画面上で決める
「編集」ボタンを押すと、ピンをドラッグで移動、空白をタップで新規追加できます。
「JSON書き出し」で `sounds.json` がダウンロードされるので、リポジトリの `sounds.json` に上書きしてください。
配置作業は PC の Chrome で行うのが楽です（iPad ではダウンロード → 共有 → ファイルに保存の手順になります）。

## 公開
GitHub Pages / Source = Deploy from a branch（main, root）でそのまま公開できます。

## GitHub Pages で別 iPad から再生する
1. GitHub で新しい公開リポジトリを作成する
2. このフォルダをそのリポジトリに push する
3. GitHub の Settings → Pages を開く
4. Source を "GitHub Actions" に設定する
5. しばらくすると `https://<user>.github.io/<repo>/` でアクセスできるようになる
6. iPad からその URL を開けば、同じサイトを別端末でも再生できる

> このサイトは `file://` ではなく HTTP/HTTPS で動く必要があります。GitHub Pages ではその条件を満たします。

## 地図を差し替える
`map.svg` を好きな画像に差し替えてください（4:3 推奨。比率を変える場合は style.css の `aspect-ratio` も合わせる）。

## 付属の音について
`sounds/` の WAV はダミー（正弦波とノイズ）です。実際の録音に差し替えてください。
