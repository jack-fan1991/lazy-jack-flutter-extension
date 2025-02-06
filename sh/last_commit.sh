#!/bin/bash

# SCRIPT_PATH="$(cd "$(dirname "$0")"; pwd)"
# SCRIPT_PATH="$(dirname "$SCRIPT_PATH")"
# REMOTE_URL="$(sh "$SCRIPT_PATH/sh/get.sh")"
# TAG_FORMAT="release_0.0."
git ls-remote git@github.com:OwlTing/owlauth_mobile.git refs/heads/main
# # 獲取遠端分支的最後一個 commit hash
# latest_commit_hash=$(git ls-remote "$REMOTE_URL" refs/heads/main | awk '{print $1}')

# # 顯示最新的 commit 訊息（只顯示正文，不顯示 hash）
# commit_message=$(git log -n 1 --pretty=%B "$latest_commit_hash")

# # 重新排版：每個 # 或 - 開頭的項目換行
# formatted_message=$(echo "$commit_message" | sed -E 's/^# /\n# /g' | sed -E 's/^\- /\n- /g')

# # 輸出排版後的訊息
# echo "$formatted_message"
SCRIPT_PATH="$(cd "$(dirname "$0")"; pwd)"
SCRIPT_PATH="$(dirname "$SCRIPT_PATH")"
changelog_file="$SCRIPT_PATH/CHANGELOG.md"
changelog=$(awk 'BEGIN {count=0} /^#/ {count++} count<3 {print} count==3 {exit}' "$changelog_file")
echo "$changelog"