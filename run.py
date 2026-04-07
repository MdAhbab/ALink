import subprocess
import sys
import os
import time
import signal


def resolve_python_executable(base_dir: str) -> str:
    if os.name == "nt":
        candidates = [
            os.path.join(base_dir, ".venv", "Scripts", "python.exe"),
            os.path.join(base_dir, "venv", "Scripts", "python.exe"),
        ]
    else:
        candidates = [
            os.path.join(base_dir, ".venv", "bin", "python"),
            os.path.join(base_dir, "venv", "bin", "python"),
        ]

    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return sys.executable

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    frontend_dir = os.path.join(base_dir, "frontend")

    # Determine Python executable: prefer .venv, then venv, then current interpreter.
    python_exe = resolve_python_executable(base_dir)
    print(f"Using Python: {python_exe}")

    # Command to run the backend
    backend_cmd = [python_exe, "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
    
    # Command to run the frontend
    frontend_cmd = [python_exe, "-m", "http.server", "5500"]

    print("Starting Backend on http://127.0.0.1:8000 ...")
    backend_process = subprocess.Popen(backend_cmd, cwd=backend_dir)

    time.sleep(1) # Let the backend start up a bit 

    print("Starting Frontend on http://127.0.0.1:5500 ...")
    # We can use sys.executable for frontend since it just needs http.server (standard lib)
    frontend_process = subprocess.Popen(frontend_cmd, cwd=frontend_dir)

    def signal_handler(sig, frame):
        print("\nShutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        backend_process.wait()
        frontend_process.wait()
        print("Servers stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    print("\n" + "="*50)
    print("🚀 ALink is running!")
    print("Frontend URL: http://127.0.0.1:5500")
    print("Backend API Docs: http://127.0.0.1:8000/docs")
    print("Press Ctrl+C to stop both servers.")
    print("="*50 + "\n")
    
    try:
        # Keep the main thread alive waiting for an interrupt
        while True:
            time.sleep(1)
            # Monitor if child processes died unexpectedly
            if backend_process.poll() is not None or frontend_process.poll() is not None:
                print("\nOne of the servers crushed. Shutting down...")
                break
    except KeyboardInterrupt:
        pass
    finally:
        signal_handler(signal.SIGINT, None)

if __name__ == "__main__":
    main()