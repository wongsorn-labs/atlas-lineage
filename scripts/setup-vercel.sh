#!/usr/bin/env bash
# Atlas Lineage – one-shot Vercel setup (free Hobby plan)
# Usage: bash scripts/setup-vercel.sh <your-vercel-token>
set -euo pipefail

TOKEN="${1:-${VERCEL_TOKEN:-}}"
if [[ -z "$TOKEN" ]]; then
  echo "Usage: bash scripts/setup-vercel.sh <vercel-token>" >&2
  exit 1
fi

BASE="https://api.vercel.com"
PROJECT_NAME="atlas-lineage"
GITHUB_REPO="wongsorn-labs/atlas-lineage"
BRANCH="claude/deploy-vercel-B6SCl"

# ── helpers ────────────────────────────────────────────────────────────────────
call() {
  local method=$1 path=$2; shift 2
  curl -sf -X "$method" "$BASE$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    "$@"
}

py() { python3 -c "import sys,json; d=json.load(sys.stdin); $1"; }

sep() { echo; echo "── $* "; echo "────────────────────────────────────────────────"; }

# ── 1. Verify token & get account ─────────────────────────────────────────────
sep "1/5  Authenticating"
USER_DATA=$(call GET /v2/user)
USERNAME=$(echo "$USER_DATA" | py "print(d['user']['username'])")
PLAN=$(echo "$USER_DATA"    | py "print(d['user'].get('plan','hobby'))")
echo "  User : $USERNAME  (plan: $PLAN)"

TEAMS=$(call GET /v2/teams)
TEAM_ID=$(echo "$TEAMS" | python3 -c "
import sys,json
t=json.load(sys.stdin).get('teams',[])
print(t[0]['id'] if t else '')" 2>/dev/null || echo "")
QS=$([[ -n "$TEAM_ID" ]] && echo "?teamId=$TEAM_ID" || echo "")
[[ -n "$TEAM_ID" ]] && echo "  Team : $TEAM_ID"

# ── 2. Create project linked to GitHub ────────────────────────────────────────
sep "2/5  Creating Vercel project"
PROJECT_RESP=$(call POST "/v9/projects$QS" -d "{
  \"name\": \"$PROJECT_NAME\",
  \"gitRepository\": { \"type\": \"github\", \"repo\": \"$GITHUB_REPO\" },
  \"nodeVersion\": \"20.x\"
}" 2>/dev/null || echo "{}")

ERR_CODE=$(echo "$PROJECT_RESP" | py "print(d.get('error',{}).get('code',''))" 2>/dev/null || echo "")
if [[ "$ERR_CODE" == "project_already_exists" ]]; then
  echo "  Project already exists – loading it..."
  PROJECT_RESP=$(call GET "/v9/projects/$PROJECT_NAME$QS")
fi

PROJECT_ID=$(echo "$PROJECT_RESP" | py "print(d['id'])")
REPO_ID=$(echo "$PROJECT_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(d.get('link',{}).get('repoId','') or '')" 2>/dev/null || echo "")

echo "  Project ID : $PROJECT_ID"
echo "  GitHub     : ${REPO_ID:+linked (repoId=$REPO_ID)}${REPO_ID:-not linked yet}"

if [[ -z "$REPO_ID" ]]; then
  echo
  echo "  ⚠  GitHub not linked. Do this once in the dashboard:"
  echo "     https://vercel.com/${USERNAME}/${PROJECT_NAME}/settings/git"
  echo "     → Connect Git Repository → wongsorn-labs/atlas-lineage"
  echo
fi

# ── 3. Free-tier Neon Postgres via Vercel Storage API ─────────────────────────
sep "3/5  Provisioning Neon Postgres (free tier)"
echo "  Requesting database 'atlas-lineage-db' in region iad1..."

DB_RESP=$(call POST "/v1/storage/databases$QS" -d '{
  "name":    "atlas-lineage-db",
  "type":    "postgres",
  "regions": ["iad1"]
}' 2>/dev/null || echo "{}")

DB_ID=$(echo "$DB_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(d.get('store',{}).get('id','')
      or d.get('database',{}).get('id',''))" 2>/dev/null || echo "")

DB_PROVISIONED=false
if [[ -n "$DB_ID" ]]; then
  echo "  ✓ Database created: $DB_ID"

  # Connect db → project so Vercel injects DATABASE_URL automatically
  CONNECT=$(call POST "/v1/storage/databases/$DB_ID/connect$QS" -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"environments\": [\"production\", \"preview\"]
  }" 2>/dev/null || echo "{}")

  CONNECT_OK=$(echo "$CONNECT" | py "print('ok' if 'id' in d or d.get('connected') else '')" 2>/dev/null || echo "")
  if [[ -n "$CONNECT_OK" ]]; then
    echo "  ✓ Connected to project – DATABASE_URL will be injected automatically"
    DB_PROVISIONED=true
  else
    echo "  ✗ Auto-connect failed. Do it manually (30 sec):"
    echo "    https://vercel.com/${USERNAME}/${PROJECT_NAME}"
    echo "    → Storage tab → $DB_ID → Connect to project"
  fi
else
  DB_ERR=$(echo "$DB_RESP" | py "print(d.get('error',{}).get('message','unknown'))" 2>/dev/null || echo "unknown")
  echo "  ✗ Could not auto-provision: $DB_ERR"
  echo
  echo "  Free alternative – do this in 60 seconds:"
  echo "  ┌─────────────────────────────────────────────────────────────┐"
  echo "  │  1. vercel.com → your project → Storage tab                │"
  echo "  │  2. Create Database → Postgres (Neon) → free Hobby tier    │"
  echo "  │  3. Connect to '$PROJECT_NAME' → DATABASE_URL is set       │"
  echo "  └─────────────────────────────────────────────────────────────┘"
fi

# ── 4. Set ENCRYPTION_KEY and CORS_ORIGIN ────────────────────────────────────
sep "4/5  Setting environment variables"

ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

set_env() {
  local key=$1 val=$2 type=${3:-encrypted}
  local resp
  resp=$(call POST "/v9/projects/$PROJECT_ID/env$QS" -d "{
    \"key\":    \"$key\",
    \"value\":  \"$val\",
    \"type\":   \"$type\",
    \"target\": [\"production\",\"preview\"]
  }" 2>/dev/null || echo "{}")
  local err
  err=$(echo "$resp" | py "print(d.get('error',{}).get('code',''))" 2>/dev/null || echo "")
  if [[ "$err" == "ENV_ALREADY_EXISTS" ]]; then
    echo "  ~ $key (already set – skipped)"
  elif [[ -n "$err" ]]; then
    echo "  ✗ $key: $err"
  else
    echo "  ✓ $key"
  fi
}

set_env "ENCRYPTION_KEY" "$ENCRYPTION_KEY"
set_env "CORS_ORIGIN"    "https://${PROJECT_NAME}.vercel.app" "plain"

echo
echo "  Save your ENCRYPTION_KEY (needed if you ever recreate the project):"
echo "  ENCRYPTION_KEY=$ENCRYPTION_KEY"

# ── 5. Trigger deployment ─────────────────────────────────────────────────────
sep "5/5  Triggering deployment"

if [[ -n "$REPO_ID" ]]; then
  DEPLOY_RESP=$(call POST "/v13/deployments$QS" -d "{
    \"name\": \"$PROJECT_NAME\",
    \"gitSource\": {
      \"type\":   \"github\",
      \"repoId\": $REPO_ID,
      \"ref\":    \"$BRANCH\"
    }
  }" 2>/dev/null || echo "{}")

  DEPLOY_URL=$(echo "$DEPLOY_RESP" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(d.get('url','') or d.get('error',{}).get('message','unknown'))" 2>/dev/null || echo "")

  if [[ "$DEPLOY_URL" =~ [a-z0-9]+-[a-z0-9]+-[a-z0-9]+\.vercel\.app ]] || \
     [[ "$DEPLOY_URL" =~ ^${PROJECT_NAME} ]]; then
    echo "  ✓ Building now: https://$DEPLOY_URL"
    echo "    (takes ~2 min; watch progress at https://vercel.com/${USERNAME}/${PROJECT_NAME})"
  else
    echo "  ✗ Could not trigger automatically: $DEPLOY_URL"
    echo "  ➜  Merge the branch or push to main to auto-deploy via GitHub."
  fi
else
  echo "  Skipped – link GitHub first (step 2 above), then redeploy:"
  echo "  ➜  Push any commit to trigger auto-deploy."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Atlas Lineage – Vercel setup complete                      ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Dashboard : https://vercel.com/${USERNAME}/${PROJECT_NAME}"
echo "║  App URL   : https://${PROJECT_NAME}.vercel.app"
echo "╠══════════════════════════════════════════════════════════════╣"
if [[ "$DB_PROVISIONED" == false ]]; then
echo "║  ⚠  Still needed: DATABASE_URL                              ║"
echo "║     Dashboard → Storage → Create Database → Neon Postgres   ║"
fi
echo "╚══════════════════════════════════════════════════════════════╝"
