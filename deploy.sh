#!/usr/bin/env bash
# 数秘電卓アプリを GitHub Pages へ公開する。
#
# 公開されるのはリポジトリ直下の index.html / invite-card.html / sw.js の3つだけ。
# GitHub の Web UI から手作業でアップロードしていた工程を置き換えるもので、
# 認証は Windows 資格情報マネージャー（Git Credential Manager）に保存済みの
# ものを使う。
#
#   使い方:  ./deploy.sh "コミットメッセージ"
#            ./deploy.sh --check      公開せず、差分の確認だけ行う
#
set -euo pipefail

cd "$(dirname "$0")"

PUBLISHED=(index.html invite-card.html sw.js)
SITE="https://takashi33.github.io/numerology-calculator"

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }
die() { printf '\n\033[31m%s\033[0m\n' "$1" >&2; exit 1; }

CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

# ---- 1. 公開対象がそろっているか -------------------------------------------
for f in "${PUBLISHED[@]}"; do
  [ -f "$f" ] || die "公開対象 $f が見つかりません。"
done

# ---- 2. リモートの状態を取り込む -------------------------------------------
say "1/5 リモートの状態を取得"
git fetch --quiet origin main

BEHIND=$(git rev-list --count HEAD..origin/main)
AHEAD=$(git rev-list --count origin/main..HEAD)
echo "  ローカル: origin より ${AHEAD} コミット先行 / ${BEHIND} コミット遅れ"

# Web UI から直接アップロードされた変更が origin にある場合、そのまま push すると
# 弾かれる（または上書きしてしまう）。先に取り込む。
if [ "$BEHIND" -gt 0 ]; then
  if [ "$AHEAD" -gt 0 ]; then
    # PC とクラウドの両方から作業するようになると、この分岐は珍しくなくなる
    # （片方で push したのを、もう片方が取り込む前に commit した場合など）。
    # 自動で解決すると取り違えが怖いので、手順だけ示して止める。
    die "ローカルとリモートが分岐しています（先行 ${AHEAD} / 遅れ ${BEHIND}）。
別の環境から push した内容が origin にあり、こちらにも未 push のコミットがあります。

  1. まず何が起きているか見る:
       git log --oneline --graph --all -20
  2. 中身が競合していなければ、こちらのコミットを相手の上に載せ直す:
       git pull --rebase origin main
  3. 競合したらファイルを直してから:
       git rebase --continue
  4. 解決したらもう一度 ./deploy.sh を実行する"
  fi
  say "  リモートが進んでいるので早送りします"
  git merge --ff-only origin/main
fi

# ---- 3. 差分を見せる --------------------------------------------------------
say "2/5 公開ファイルの差分"
if git diff --quiet -- "${PUBLISHED[@]}" && git diff --cached --quiet -- "${PUBLISHED[@]}"; then
  echo "  公開3ファイルに変更はありません。"
  PUBLISHED_CHANGED=0
else
  git diff --stat HEAD -- "${PUBLISHED[@]}"
  PUBLISHED_CHANGED=1
fi

say "3/5 その他の変更"
# 公開3ファイルは pathspec で除外する。パス文字列で grep すると
# webapp/index.html のような「別ファイルだが名前を含む」ものまで消えてしまう。
OTHER=$(git status --short -- . ':!index.html' ':!invite-card.html' ':!sw.js')
[ -n "$OTHER" ] && echo "$OTHER" || echo "  なし"

if [ "$CHECK_ONLY" -eq 1 ]; then
  say "--check のため、ここで終了します（何も公開していません）。"
  exit 0
fi

# ---- 4. コミットして push ---------------------------------------------------
if [ -z "$(git status --porcelain)" ]; then
  say "コミットする変更がありません。"
else
  MSG="${1:-Update numerology calculator}"
  say "4/5 コミット: $MSG"
  git add -A
  git commit --quiet -m "$MSG"
fi

say "5/5 push"
git push --quiet origin main
echo "  完了: $(git log --oneline -1)"

# ---- 5. 公開の反映を確認 ----------------------------------------------------
# GitHub Pages のビルドには十数秒かかる。反映されるまで待って実物を照合する。
#
# このスクリプトは PC からもクラウド（Claude Code のリモート環境）からも使う。
# クラウド側はネットワークポリシーで github.io への通信が塞がれていることが
# あり、そこでは公開先に到達できない。その場合は「反映されなかった」のでは
# なく「確認できなかった」だけなので、両者をはっきり区別して伝える。
LOCAL_HASH=$(tr -d '\r' < index.html | md5sum | cut -d' ' -f1)
LIVE_TMP=$(mktemp)
trap 'rm -f "$LIVE_TMP"' EXIT

# 取得と照合を分ける。以前はパイプで md5sum まで繋いでいたが（pipefail が
# 効いているので失敗の検知自体はできていた）、到達できない環境では 18回×5秒
# の空振りを最後まで回してから「反映されませんでした」と出てしまい、
# 「反映が遅い」のか「そもそも見に行けない」のかが読み手に分からなかった。
# 先に1回だけ叩いて到達可否を判定し、届かないならすぐ切り上げる。
fetch_live() {
  curl -fsSL -m 20 -H 'Cache-Control: no-cache' "$SITE/index.html" -o "$LIVE_TMP" 2>/dev/null
}

if ! fetch_live; then
  printf '\n\033[33mpush は成功しました。
ただしこの環境からは %s に到達できないため、反映の確認は省略します
（クラウド側ではネットワークポリシーで塞がれていることがあります）。
ブラウザで開いて確認してください。\033[0m\n' "$SITE"
  exit 0
fi

say "公開の反映を確認しています（最大90秒）"
for i in $(seq 1 18); do
  sleep 5
  fetch_live || continue
  LIVE_HASH=$(tr -d '\r' < "$LIVE_TMP" | md5sum | cut -d' ' -f1)
  if [ "$LIVE_HASH" = "$LOCAL_HASH" ]; then
    printf '\n\033[32m公開を確認しました: %s/\033[0m\n' "$SITE"
    exit 0
  fi
  printf '.'
done

printf '\n\033[33mpush は成功しましたが、90秒以内に公開へ反映されませんでした。
GitHub Pages のビルド待ちの可能性があります。数分後に下記で再確認してください:
  curl -s %s/index.html | tr -d "\\r" | md5sum
  ローカル: %s\033[0m\n' "$SITE" "$LOCAL_HASH"
