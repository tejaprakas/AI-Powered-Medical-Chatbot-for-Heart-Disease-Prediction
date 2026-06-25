import os
import sys
import subprocess
import venv
import shutil

def print_ascii_art():
    print(r"""
============================================================
  ____        _       _   _              __     __    _ 
 / ___|  ___ | |_   _| |_(_) ___  _ __   \ \   / /_ _| |
 \___ \ / _ \| | | | | __| |/ _ \| '_ \   \ \ / / _` | |
  ___) | (_) | | |_| | |_| | (_) | | | |   \ V / (_| | |
 |____/ \___/|_|\__,_|\__|_|\___/|_| |_|    \_/ \__,_|_|
                                                        
        PROBLEM-SOLUTION VALIDATION ENGINE
============================================================
  Developed by Antigravity AI | Solutions Architecture
    """)

def setup_venv(venv_dir=".venv"):
    """Creates a virtual environment if it doesn't already exist."""
    if not os.path.exists(venv_dir):
        print(f"[*] Creating Python Virtual Environment in '{venv_dir}'...")
        venv.create(venv_dir, with_pip=True)
        print("[+] Virtual environment created successfully.")
    else:
        print("[*] Virtual environment already initialized.")

def get_python_exe(venv_dir=".venv"):
    """Returns path to the virtual environment python interpreter."""
    if sys.platform.startswith("win"):
        return os.path.join(venv_dir, "Scripts", "python.exe")
    return os.path.join(venv_dir, "bin", "python")

def get_pip_exe(venv_dir=".venv"):
    """Returns path to the virtual environment pip utility."""
    if sys.platform.startswith("win"):
        return os.path.join(venv_dir, "Scripts", "pip.exe")
    return os.path.join(venv_dir, "bin", "pip")

def install_requirements(pip_exe, req_file="backend/requirements.txt"):
    """Installs required pip packages."""
    if not os.path.exists(req_file):
        print(f"[-] Requirements file not found at: {req_file}")
        return False
    print(f"[*] Upgrading pip and installing dependencies from '{req_file}'...")
    try:
        subprocess.run([pip_exe, "install", "--upgrade", "pip"], check=True)
        subprocess.run([pip_exe, "install", "-r", req_file], check=True)
        print("[+] Dependency installation complete.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[-] Dependency installation failed: {e}")
        return False

def start_server(python_exe):
    """Launches the uvicorn development server."""
    print("\n[*] Starting FastAPI development server...")
    print("------------------------------------------------------------")
    print("  👉  Server address: http://127.0.0.1:8000/")
    print("  👉  Interactive API: http://127.0.0.1:8000/docs")
    print("------------------------------------------------------------")
    print("[*] Press Ctrl+C to terminate the application.")
    
    try:
        # Run uvicorn server via python interpreter
        cmd = [python_exe, "-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\n[+] Validation Engine shut down successfully.")
    except Exception as e:
        print(f"\n[-] Failed to start server: {e}")

def main():
    print_ascii_art()
    
    # 1. Setup Venv
    venv_dir = ".venv"
    setup_venv(venv_dir)
    
    python_exe = get_python_exe(venv_dir)
    pip_exe = get_pip_exe(venv_dir)
    
    # 2. Install Dependencies
    install_success = install_requirements(pip_exe)
    if not install_success:
        print("[-] Aborting startup due to dependency issues.")
        return

    # Check for environmental variables and print advice
    serper_key = os.environ.get("SERPER_API_KEY")
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    
    if not serper_key or not gemini_key:
        print("\n[!] Configuration Notice:")
        if not serper_key:
            print("    - 'SERPER_API_KEY' environment variable is missing. DuckDuckGo search fallback will be used.")
        if not gemini_key:
            print("    - 'GEMINI_API_KEY' is missing. Heuristic comparison reports will be generated.")
        print("    👉 Set these environment variables in your terminal to enable full dynamic AI analytics.")
    else:
        print("\n[+] All API keys loaded. Running in full-featured mode.")
        
    # 3. Launch App Server
    start_server(python_exe)

if __name__ == "__main__":
    main()
