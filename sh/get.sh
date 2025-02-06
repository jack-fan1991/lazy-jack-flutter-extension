#!/bin/bash

# filepath: /Users/jack/jackgit/ai_git_script/sh/set_remote_url.sh

# 定義 GitHub Token

# 設定 Remote URL
REMOTE_URL="https://jack-fan1991:${TOKEN}@github.com/jack-fan1991/ai_git_script.git"
git ls-remote git@github.com:OwlTing/owlauth_mobile.git refs/heads/main
# 輸出 REMOTE_URL
echo "$REMOTE_URL"