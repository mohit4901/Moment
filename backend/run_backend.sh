#!/usr/bin/env bash
# MOMENT — Backend Server Runner
# Runs the FastAPI backend on port 8000 with auto-reload

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================================"
echo " Starting MOMENT Obstetric AI Backend API Server"
echo " Time: $(date)"
echo " Docs: http://127.0.0.1:8000/docs"
echo "============================================================"

# Ensure user site packages are accessible
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

# Run Uvicorn
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
