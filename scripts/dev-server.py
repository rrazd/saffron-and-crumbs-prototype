from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path


class FreshPreviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        if "If-Modified-Since" in self.headers:
            del self.headers["If-Modified-Since"]
        super().do_GET()


directory = Path(__file__).resolve().parent.parent / "dist"
server = ThreadingHTTPServer(("", 5173), partial(FreshPreviewHandler, directory=str(directory)))
print("Local preview: http://localhost:5173 (browser caching disabled)", flush=True)
server.serve_forever()
