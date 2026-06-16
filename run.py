#!/usr/bin/env python3
"""ALink — one-command project launcher.

Creates a Python virtual environment, installs backend + frontend
dependencies when stale, then starts both services concurrently.

Usage:
    python run.py            # default ports (backend=8000, frontend=5173)
    python run.py --reset    # wipe the SQLite DB and re-seed on next boot
"""
from __future__ import annotations

import hashlib
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path


# ─── Paths ──────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

BACKEND_VENV_DIR = BACKEND_DIR / ".venv"
BACKEND_VENV_PYTHON = BACKEND_VENV_DIR / ("Scripts\\python.exe" if os.name == "nt" else "bin/python")
BACKEND_REQ_FILE = BACKEND_DIR / "requirements.txt"
BACKEND_REQ_HASH_FILE = BACKEND_VENV_DIR / ".requirements.sha256"

FRONTEND_PACKAGE_LOCK = FRONTEND_DIR / "package-lock.json"
FRONTEND_NODE_MODULES = FRONTEND_DIR / "node_modules"
FRONTEND_DEPS_HASH_FILE = FRONTEND_NODE_MODULES / ".package-lock.sha256"

BACKEND_ENV = BACKEND_DIR / ".env"
BACKEND_ENV_TEMPLATE = BACKEND_DIR / ".env.example"
BACKEND_DB = BACKEND_DIR / "alink.db"

DEFAULT_BACKEND_PORT = "8000"
DEFAULT_FRONTEND_PORT = "5173"


# ─── Helpers ────────────────────────────────────────────────────────────────
def info(message: str) -> None:
    print(f"[ALink] {message}")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            block = handle.read(65536)
            if not block:
                break
            digest.update(block)
    return digest.hexdigest()


def run_command(command: list[str], cwd: Path | None = None) -> None:
    info(f"Running: {' '.join(command)}")
    subprocess.run(command, cwd=str(cwd) if cwd else None, check=True)


# ─── Backend interpreter selection ──────────────────────────────────────────
# The pinned ML stack (numpy 2.1.1 / scipy 1.14.1 / scikit-learn 1.5.2) only
# publishes wheels for CPython 3.10–3.13.  Newer interpreters (e.g. 3.14) have
# no wheels, so pip falls back to building from source — which currently fails.
# Pick a supported interpreter instead of blindly using whatever ran this file.
MIN_PY = (3, 10)
MAX_PY = (3, 13)


def python_version(executable: str) -> tuple[int, int] | None:
    try:
        out = subprocess.run(
            [executable, "-c", "import sys; print(sys.version_info[0], sys.version_info[1])"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.split()
        return int(out[0]), int(out[1])
    except (subprocess.SubprocessError, OSError, ValueError, IndexError):
        return None


def is_supported(version: tuple[int, int] | None) -> bool:
    return version is not None and MIN_PY <= version <= MAX_PY


def find_backend_python() -> str:
    # Prefer the interpreter running this script when it is supported.
    if is_supported((sys.version_info[0], sys.version_info[1])):
        return sys.executable

    # Otherwise search PATH for a supported CPython, newest first.
    for minor in range(MAX_PY[1], MIN_PY[1] - 1, -1):
        found = shutil.which(f"python3.{minor}")
        if found and is_supported(python_version(found)):
            return found

    current = f"{sys.version_info[0]}.{sys.version_info[1]}"
    raise RuntimeError(
        f"No compatible Python interpreter found. The backend needs CPython "
        f"{MIN_PY[0]}.{MIN_PY[1]}–{MAX_PY[0]}.{MAX_PY[1]} (you are running {current}). "
        f"Install one (e.g. `brew install python@3.13`) and re-run."
    )


# ─── Backend venv ───────────────────────────────────────────────────────────
def ensure_backend_venv() -> None:
    if BACKEND_VENV_PYTHON.exists():
        if is_supported(python_version(str(BACKEND_VENV_PYTHON))):
            info("Backend virtual environment exists.")
            return
        info("Existing backend venv uses an unsupported Python; recreating...")
        shutil.rmtree(BACKEND_VENV_DIR, ignore_errors=True)

    interpreter = find_backend_python()
    version = python_version(interpreter)
    label = f"Python {version[0]}.{version[1]}" if version else "Python"
    info(f"Creating backend virtual environment ({label})...")
    run_command([interpreter, "-m", "venv", str(BACKEND_VENV_DIR)], cwd=BACKEND_DIR)


def ensure_backend_dependencies() -> None:
    if not BACKEND_REQ_FILE.exists():
        raise FileNotFoundError(f"Missing requirements file: {BACKEND_REQ_FILE}")

    new_hash = sha256(BACKEND_REQ_FILE)
    old_hash = BACKEND_REQ_HASH_FILE.read_text(encoding="utf-8").strip() if BACKEND_REQ_HASH_FILE.exists() else ""
    if old_hash == new_hash:
        info("Backend dependencies are up to date.")
        return

    info("Installing backend dependencies...")
    run_command(
        [str(BACKEND_VENV_PYTHON), "-m", "pip", "install", "--upgrade", "pip"],
        cwd=BACKEND_DIR,
    )
    run_command(
        [str(BACKEND_VENV_PYTHON), "-m", "pip", "install", "-r", str(BACKEND_REQ_FILE)],
        cwd=BACKEND_DIR,
    )
    BACKEND_REQ_HASH_FILE.write_text(new_hash, encoding="utf-8")


def ensure_backend_env() -> None:
    if BACKEND_ENV.exists():
        info("Backend .env exists.")
        return

    if BACKEND_ENV_TEMPLATE.exists():
        info("Creating backend .env from .env.example...")
        shutil.copyfile(BACKEND_ENV_TEMPLATE, BACKEND_ENV)
        return

    info("Creating backend .env with SQLite defaults...")
    BACKEND_ENV.write_text(
        "\n".join(
            [
                "database_url=sqlite:///./alink.db",
                "jwt_secret=dev-only-secret-change-me",
                "jwt_algorithm=HS256",
                "jwt_expires_minutes=10080",
                f"cors_origins=http://localhost:{DEFAULT_FRONTEND_PORT},http://127.0.0.1:{DEFAULT_FRONTEND_PORT}",
                "",
            ]
        ),
        encoding="utf-8",
    )


# ─── Frontend deps ──────────────────────────────────────────────────────────
def npm_command() -> str:
    return "npm.cmd" if os.name == "nt" else "npm"


def ensure_frontend_dependencies() -> None:
    if not FRONTEND_PACKAGE_LOCK.exists():
        raise FileNotFoundError(f"Missing package-lock.json: {FRONTEND_PACKAGE_LOCK}")

    new_hash = sha256(FRONTEND_PACKAGE_LOCK)
    old_hash = FRONTEND_DEPS_HASH_FILE.read_text(encoding="utf-8").strip() if FRONTEND_DEPS_HASH_FILE.exists() else ""
    if FRONTEND_NODE_MODULES.exists() and old_hash == new_hash:
        info("Frontend dependencies are up to date.")
        return

    info("Installing frontend dependencies...")
    run_command([npm_command(), "install"], cwd=FRONTEND_DIR)
    FRONTEND_NODE_MODULES.mkdir(parents=True, exist_ok=True)
    FRONTEND_DEPS_HASH_FILE.write_text(new_hash, encoding="utf-8")


# ─── Services ───────────────────────────────────────────────────────────────
def spawn_services() -> tuple[subprocess.Popen[str], subprocess.Popen[str]]:
    backend_port = os.getenv("BACKEND_PORT", DEFAULT_BACKEND_PORT)
    frontend_port = os.getenv("FRONTEND_PORT", DEFAULT_FRONTEND_PORT)

    backend_cmd = [
        str(BACKEND_VENV_PYTHON),
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--host",
        "127.0.0.1",
        "--port",
        backend_port,
    ]

    # npm.cmd breaks on Windows when the path contains & or other special
    # characters.  Invoke vite directly through node to work around this.
    vite_bin = FRONTEND_DIR / "node_modules" / "vite" / "bin" / "vite.js"
    if os.name == "nt" and vite_bin.exists():
        frontend_cmd = ["node", str(vite_bin), "--host", "127.0.0.1", "--port", frontend_port]
    else:
        frontend_cmd = [npm_command(), "run", "dev", "--", "--host", "127.0.0.1", "--port", frontend_port]

    info(f"Starting backend  -> http://127.0.0.1:{backend_port}")
    backend_proc = subprocess.Popen(backend_cmd, cwd=str(BACKEND_DIR))

    info(f"Starting frontend -> http://127.0.0.1:{frontend_port}")
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=str(FRONTEND_DIR))
    return backend_proc, frontend_proc


def terminate_process(proc: subprocess.Popen[str], name: str) -> None:
    if proc.poll() is not None:
        return
    info(f"Stopping {name}...")
    if os.name == "nt":
        proc.terminate()
    else:
        proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(timeout=8)
    except subprocess.TimeoutExpired:
        info(f"Force killing {name}...")
        proc.kill()


# ─── Main ───────────────────────────────────────────────────────────────────
def main() -> int:
    # Handle --reset flag
    if "--reset" in sys.argv:
        info("Resetting database...")
        if BACKEND_DB.exists():
            try:
                BACKEND_DB.unlink()
                info("Deleted alink.db -- it will be re-seeded on next start.")
            except PermissionError:
                info("WARNING: Could not delete alink.db (file is locked).")
                info("Close any other running instances and try again.")

    try:
        ensure_backend_venv()
        ensure_backend_dependencies()
        ensure_backend_env()
        ensure_frontend_dependencies()

        backend_proc, frontend_proc = spawn_services()

        def handle_shutdown(_: int, __: object) -> None:
            terminate_process(frontend_proc, "frontend")
            terminate_process(backend_proc, "backend")
            raise KeyboardInterrupt

        signal.signal(signal.SIGINT, handle_shutdown)
        if hasattr(signal, "SIGTERM"):
            signal.signal(signal.SIGTERM, handle_shutdown)

        while True:
            backend_code = backend_proc.poll()
            frontend_code = frontend_proc.poll()
            if backend_code is not None:
                info(f"Backend exited with code {backend_code}.")
                terminate_process(frontend_proc, "frontend")
                return backend_code
            if frontend_code is not None:
                info(f"Frontend exited with code {frontend_code}.")
                terminate_process(backend_proc, "backend")
                return frontend_code
            time.sleep(1)
    except KeyboardInterrupt:
        info("Shutting down services...")
        return 0
    except subprocess.CalledProcessError as exc:
        info(f"Command failed with exit code {exc.returncode}.")
        return exc.returncode
    except Exception as exc:  # noqa: BLE001
        info(f"Error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
