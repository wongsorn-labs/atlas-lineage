#!/usr/bin/env bash
# Atlas Lineage – one-shot Vercel setup
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

jq_get() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

print_step() { echo; echo "── $* ──────────────────────────────────────────────"; }

# ── 1. Verify token & get account ──────────────────────────────────────────────
print_step "Authenticating"
USER_DATA=$(call GET /v2/user)
USERNAME=$(echo "$USER_DATA" | jq_get "d['user']['username']")
echo "  Logged in as: $USERNAME"

TEAMS=$(call GET /v2/teams)
TEAM_ID=$(echo "$TEAMS" | python3 -c "
import sys, json
teams = json.load(sys.stdin).get('teams', [])
print(teams[0]['id'] if teams else '')
" 2>/dev/null || echo "")
QS=$([[ -n "$TEAM_ID" ]] && echo "?teamId=$TEAM_ID" || echo "")
[[ -n "$TEAM_ID" ]] && echo "  Team: $TEAM_ID"

# ── 2. Create Vercel project linked to GitHub ──────────────────────────────────
print_step "Creating project"
PROJECT_RESP=$(call POST "/v9/projects$QS" -d "{
  \"name\": \"$PROJECT_NAME\",
  \"gitRepository\": { \"type\": \"github\", \"repo\": \"$GITHUB_REPO\" },
  \"nodeVersion\": \"20.x\"
}" 2>/dev/null || echo "{}")

ERR=$(echo "$PROJECT_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('code',''))" 2>/dev/null || echo "")
if [[ "$ERR" == "project_already_exists" ]]; then
  echo "  Project already exists – fetching existing project..."
  PROJECT_RESP=$(call GET "/v9/projects/$PROJECT_NAME$QS")
fi

PROJECT_ID=$(echo "$PROJECT_RESP" | jq_get "d['id']")
REPO_ID=$(echo "$PROJECT_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('link', {}).get('repoId', '') or '')
" 2>/dev/null || echo "")
echo "  Project ID : $PROJECT_ID"
echo "  Repo ID    : ${REPO_ID:-not linked yet – link GitHub in the dashboard}"

# ── 3. Provision Vercel Postgres (Neon) ────────────────────────────────────────
print_step "Provisioning Postgres database"
DB_RESP=$(call POST "/v1/storage/databases$QS" -d "{
  \"name\": \"atlas-lineage-db\",
  \"type\": \"postgres\",
  \"regions\": [\"iad1\"]
}" 2>/dev/null || echo "{}")

DB_ID=$(echo "$DB_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('store',{}).get('id',''))" 2>/dev/null || echo "")

if [[ -n "$DB_ID" ]]; then
  echo "  Database ID: $DB_ID"

  # Connect database to project (sets DATABASE_URL etc. automatically)
  call POST "/v1/storage/databases/$DB_ID/connect$QS" -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"environments\": [\"production\", \"preview\"]
  }" > /dev/null 2>&1 && echo "  Connected to project – DATABASE_URL set automatically" || \
    echo "  Could not auto-connect – see instructions below"
else
  echo "  Could not provision automatically (may need a paid plan)."
  echo "  ➜  Dashboard: https://vercel.com/${USERNAME}/${PROJECT_NAME}"
  echo "     Storage → Create Database → Neon Postgres → connect to project"
fi

# ── 4. Set remaining environment variables ─────────────────────────────────────
print_step "Setting environment variables"

ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

set_env() {
  local key=$1 val=$2 type=${3:-encrypted}
  call POST "/v9/projects/$PROJECT_ID/env$QS" -d "{
    \"key\": \"$key\",
    \"value\": \"$val\",
    \"type\": \"$type\",
    \"target\": [\"production\", \"preview\"]
  }" > /dev/null 2>&1 && echo "  ✓ $key" || echo "  ✗ $key (may already exist)"
}

set_env "ENCRYPTION_KEY"  "$ENCRYPTION_KEY"
set_env "CORS_ORIGIN"     "https://${PROJECT_NAME}.vercel.app" "plain"

echo
echo "  ENCRYPTION_KEY = $ENCRYPTION_KEY"
echo "  (save this if you ever need to re-create the project)"

# ── 5. Trigger deployment ──────────────────────────────────────────────────────
print_step "Triggering deployment"

if [[ -n "$REPO_ID" ]]; then
  DEPLOY_RESP=$(call POST "/v13/deployments$QS" -d "{
    \"name\": \"$PROJECT_NAME\",
    \"gitSource\": {
      \"type\": \"github\",
      \"repoId\": $REPO_ID,
      \"ref\": \"$BRANCH\"
    }
  }" 2>/dev/null || echo "{}")

  DEPLOY_URL=$(echo "$DEPLOY_RESP" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('url', '') or d.get('error', {}).get('message', 'unknown error'))
" 2>/dev/null || echo "")

  if [[ "$DEPLOY_URL" == *.vercel.app* ]] || [[ "$DEPLOY_URL" =~ ^[a-z0-9-]+-[a-z0-9]+ ]]; then
    echo "  ✓ Deployment started: https://$DEPLOY_URL"
  else
    echo "  Could not trigger deployment automatically: $DEPLOY_URL"
    echo "  ➜  Push to main or open a PR to deploy automatically."
  fi
else
  echo "  Skipped – GitHub not linked yet."
  echo "  ➜  Link GitHub in the Vercel dashboard, then push to trigger deploy."
fi

# ── 6. Summary ─────────────────────────────────────────────────────────────────
echo
echo "══════════════════════════════════════════════════════════════"
echo "  Atlas Lineage on Vercel"
echo "  Project : https://vercel.com/${USERNAME}/${PROJECT_NAME}"
echo "  App URL : https://${PROJECT_NAME}.vercel.app"
echo
echo "  Remaining manual step (if Postgres wasn't auto-provisioned):"
echo "    Dashboard → Storage → Create Database → Neon Postgres"
echo "    then connect it to the '$PROJECT_NAME' project"
echo "══════════════════════════════════════════════════════════════"
