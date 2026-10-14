"""Serve the Scenario Forge dashboard and lab files on localhost (no extra dependencies)."""
import argparse
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import socket
import threading
import webbrowser
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
WORKSPACE_ID = hashlib.sha256(os.path.normcase(str(ROOT)).encode("utf-8")).hexdigest()[:16]


class LocalServer(ThreadingHTTPServer):
    # Windows otherwise permits multiple HTTPServer sockets to reuse one listening port.
    allow_reuse_address = False

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


class DashboardHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.send_response(302)
            self.send_header("Location", "/ui/")
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Scenario-Forge-Workspace", WORKSPACE_ID)
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--open", action="store_true", help="Open the dashboard in your browser")
    args = parser.parse_args()
    handler = partial(DashboardHandler, directory=str(ROOT))
    try:
        server = LocalServer(("127.0.0.1", args.port), handler)
    except OSError as exc:
        url = f"http://127.0.0.1:{args.port}/ui/"
        try:
            with urlopen(url, timeout=2) as response:
                same_workspace = response.headers.get("X-Scenario-Forge-Workspace") == WORKSPACE_ID
        except OSError:
            same_workspace = False
        if same_workspace:
            print(f"Scenario Forge is already running: {url}", flush=True)
            if args.open:
                webbrowser.open(url)
            return
        parser.exit(1, f"Cannot start local server: {exc}\nTry another port: python serve_ui.py --port 8001 --open\n")
    url = f"http://127.0.0.1:{server.server_port}/ui/"
    print(f"Scenario Forge is ready: {url}\nPress Ctrl+C to stop.", flush=True)
    if args.open:
        timer = threading.Timer(0.5, webbrowser.open, args=(url,))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nLocal server stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
