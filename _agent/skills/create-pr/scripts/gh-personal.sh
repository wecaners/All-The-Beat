#!/usr/bin/env bash
# 이 저장소의 gh 명령을 개인 계정 토큰으로 실행한다.
# 이 컴퓨터의 gh 기본(active) 계정은 이 프로젝트 계정이 아니라, 전역 전환(gh auth switch) 대신 명령마다 GH_TOKEN을 넘긴다.
# GH_ACCOUNT: 이 프로젝트 계정(기본 wecaners). GH_DEFAULT_ACCOUNT: 원래 기본 계정(안내 문구에만 쓴다)
#
#   gh-personal.sh whoami          # 어떤 계정으로 실행되는지 확인
#   gh-personal.sh pr list ...     # 나머지는 gh에 그대로 전달
set -euo pipefail

ACCOUNT="${GH_ACCOUNT:-wecaners}"

if ! TOKEN="$(gh auth token --hostname github.com --user "$ACCOUNT" 2>/dev/null)"; then
  cat >&2 <<EOF
✗ gh에 '$ACCOUNT' 계정이 로그인돼 있지 않아요. 터미널에서 직접 실행해 주세요:
    gh auth login --hostname github.com --git-protocol ssh --web
    gh auth switch --hostname github.com --user ${GH_DEFAULT_ACCOUNT:-<원래 기본 계정>}   # 기본 계정을 원래대로 되돌리기
EOF
  exit 2
fi

if [[ "${1:-}" == "whoami" ]]; then
  GH_TOKEN="$TOKEN" gh api user --jq .login
  exit 0
fi

GH_TOKEN="$TOKEN" exec gh "$@"
