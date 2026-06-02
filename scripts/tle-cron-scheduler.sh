#!/usr/bin/env bash
# Manage the scenario-globe-viewer TLE refresh cron job.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="${PROJECT_DIR}/logs/tle"
LOG_FILE="${LOG_DIR}/tle-refresh.log"
LOCK_DIR="${LOG_DIR}/refresh.lock"
CRON_BEGIN="# scenario-globe-viewer TLE refresh begin"
CRON_END="# scenario-globe-viewer TLE refresh end"
LOCAL_CACHE_DOWNLOADER="${LOCAL_CACHE_DOWNLOADER:-/home/sat/satellite/tle_data/scripts/daily_tle_download_enhanced.sh}"
NPM_BIN="${NPM_BIN:-}"
if [[ -z "$NPM_BIN" ]]; then
  NPM_BIN="$(command -v npm 2>/dev/null || true)"
fi

log_info() { printf '[INFO] %s\n' "$*"; }
log_warn() { printf '[WARN] %s\n' "$*"; }
log_error() { printf '[ERROR] %s\n' "$*" >&2; }
log_success() { printf '[SUCCESS] %s\n' "$*"; }

create_directories() {
  mkdir -p "$LOG_DIR"
}

cron_command() {
  if [[ -n "$NPM_BIN" ]]; then
    printf 'NPM_BIN=%q %q run >> %q 2>&1' "$NPM_BIN" "$SCRIPT_DIR/tle-cron-scheduler.sh" "$LOG_FILE"
  else
    printf '%q run >> %q 2>&1' "$SCRIPT_DIR/tle-cron-scheduler.sh" "$LOG_FILE"
  fi
}

generate_cron_block() {
  cat <<EOF
$CRON_BEGIN
# Runs at 02:00, 08:00, 14:00, and 20:00 local server time.
0 2,8,14,20 * * * $(cron_command)
$CRON_END
EOF
}

current_crontab_without_block() {
  crontab -l 2>/dev/null | awk -v begin="$CRON_BEGIN" -v end="$CRON_END" '
    $0 == begin { skipping = 1; next }
    $0 == end { skipping = 0; next }
    !skipping { print }
  '
}

cron_exists() {
  crontab -l 2>/dev/null | grep -Fq "$CRON_BEGIN"
}

installed_cron_block() {
  crontab -l 2>/dev/null | awk -v begin="$CRON_BEGIN" -v end="$CRON_END" '
    $0 == begin { printing = 1 }
    printing { print }
    $0 == end { printing = 0 }
  '
}

install_cron() {
  create_directories
  local temp_cron
  temp_cron="$(mktemp)"
  current_crontab_without_block > "$temp_cron" || true
  {
    printf '\n'
    generate_cron_block
  } >> "$temp_cron"
  crontab "$temp_cron"
  rm -f "$temp_cron"
  log_success "Installed TLE refresh cron job."
  log_info "Schedule: 02:00, 08:00, 14:00, 20:00 local server time."
  log_info "Log: $LOG_FILE"
}

remove_cron() {
  local temp_cron
  temp_cron="$(mktemp)"
  current_crontab_without_block > "$temp_cron" || true
  crontab "$temp_cron"
  rm -f "$temp_cron"
  log_success "Removed TLE refresh cron job."
}

show_status() {
  create_directories
  if cron_exists; then
    log_success "Cron status: installed"
    installed_cron_block
    if installed_cron_block | grep -Fq "$SCRIPT_DIR/tle-cron-scheduler.sh"; then
      log_success "Cron target matches this checkout: $PROJECT_DIR"
    else
      log_warn "Cron target points at a different checkout. Re-run npm run tle:schedule:install from the desired project directory."
    fi
  else
    log_warn "Cron status: not installed"
  fi
  if [[ -f "$LOG_FILE" ]]; then
    log_info "Log: $LOG_FILE"
  else
    log_info "Log: not created yet ($LOG_FILE)"
  fi
}

show_logs() {
  local lines="${1:-40}"
  if [[ -f "$LOG_FILE" ]]; then
    tail -n "$lines" "$LOG_FILE"
  else
    log_warn "Log file does not exist: $LOG_FILE"
  fi
}

run_refresh() {
  create_directories
  if [[ -z "$NPM_BIN" ]]; then
    log_error "npm was not found. Set NPM_BIN=/path/to/npm in the cron entry or environment."
    exit 1
  fi
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    log_warn "TLE refresh is already running; skipping this cycle."
    return 0
  fi
  trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

  local started_at
  started_at="$(date -Iseconds)"
  log_info "TLE refresh started at $started_at"

  if [[ -x "$LOCAL_CACHE_DOWNLOADER" ]]; then
    log_info "Refreshing external local cache: $LOCAL_CACHE_DOWNLOADER"
    if ! "$LOCAL_CACHE_DOWNLOADER"; then
      log_warn "External local cache refresh failed; continuing with available cache."
    fi
  else
    log_warn "External local cache downloader not found: $LOCAL_CACHE_DOWNLOADER"
  fi

  log_info "Refreshing project CelesTrak artifacts."
  (
    cd "$PROJECT_DIR"
    "$NPM_BIN" run refresh:tle
  )

  log_info "Importing available local TLE cache into project fixtures."
  (
    cd "$PROJECT_DIR"
    "$NPM_BIN" run refresh:tle:local -- --groups leo,meo,geo --leo-source oneweb --skip-missing --max-records 600
  )

  log_success "TLE refresh finished at $(date -Iseconds)"
}

rotate_logs() {
  create_directories
  if [[ -f "$LOG_FILE" ]] && [[ "$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)" -gt 1048576 ]]; then
    local timestamp
    timestamp="$(date '+%Y%m%d_%H%M%S')"
    gzip -c "$LOG_FILE" > "$LOG_DIR/tle-refresh-$timestamp.log.gz"
    : > "$LOG_FILE"
  fi
  find "$LOG_DIR" -name "*.log.gz" -mtime +30 -delete 2>/dev/null || true
  log_success "Log rotation complete."
}

show_help() {
  cat <<EOF
TLE refresh scheduler

Usage: $0 <command>

Commands:
  install      Install cron schedule
  remove       Remove cron schedule
  uninstall    Alias of remove
  status       Show cron and log status
  logs [n]     Show recent log lines
  run          Run one refresh/import cycle now
  rotate       Rotate logs
  help         Show this help

Notes:
  Cron entries use an absolute script path because cron does not run from the
  project directory. If this checkout is moved, run install again from the new
  location; the marker block above is replaced in-place.
EOF
}

main() {
  case "${1:-help}" in
    install)
      install_cron
      ;;
    remove|uninstall)
      remove_cron
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs "${2:-40}"
      ;;
    run)
      run_refresh
      ;;
    rotate)
      rotate_logs
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      log_error "Unknown command: $1"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
