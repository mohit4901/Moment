#!/usr/bin/env bash
# MOMENT — Launch All Three Platform Services (Backend, AI Dashboard, Frontend)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "============================================================"
echo " Starting MOMENT Obstetric AI Clinical Platform (3 Services)"
echo " Time: $(date)"
echo " 1. Backend API:        http://127.0.0.1:8000 (Docs: /docs)"
echo " 2. AI Model Analytics: http://127.0.0.1:8080 (Dashboard: /MOMENT_COMPLETE_DASHBOARD.html)"
echo " 3. Frontend Web App:   http://127.0.0.1:5173"
echo "============================================================"

# 1. Start FastAPI Backend if not already running on port 8000
if ! lsof -i :8000 > /dev/null 2>&1; then
    PY_BIN="/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/Resources/Python.app/Contents/MacOS/Python"
    if [ ! -f "$PY_BIN" ]; then
        PY_BIN="python3"
    fi
    "$PY_BIN" -m uvicorn app.main:app --app-dir "$SCRIPT_DIR/backend" --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    echo "  Backend started with PID $BACKEND_PID"
    sleep 1
else
    echo "  [1/3] Backend API already running on port 8000."
fi

# 2. Start AI Analytics & Reports Dashboard Server on port 8080
if ! lsof -i :8080 > /dev/null 2>&1; then
    echo "Starting [2/3] AI Analytics & Reports Server on port 8080..."
    python3 -m http.server 8080 --directory "$SCRIPT_DIR/ai/reports" &
    AI_PID=$!
    echo "  AI Analytics Server started with PID $AI_PID"
    sleep 1
else
    echo "  [2/3] AI Analytics Server already running on port 8080."
fi

# 3. Start Frontend Dev Server on port 5173
echo "Starting [3/3] Vite + React Frontend on port 5173..."
cd "$SCRIPT_DIR/frontend"
exec npx vite --host 0.0.0.0 --port 5173 --strictPort
