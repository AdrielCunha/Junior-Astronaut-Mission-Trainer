# Generated with AI assistance (Claude). See README, "Use of AI tools".
# Sends Python code to an open Blender running the official "MCP" extension (Blender Lab, port 9876).
# Usage:
#   python3 tools/lua3d/bl.py --run tools/lua3d/make_moon.py   runs a file inside Blender (__file__ is set)
#   echo "import bpy; print(bpy.data.objects[:])" | python3 tools/lua3d/bl.py
import socket, json, sys, os
if len(sys.argv) > 2 and sys.argv[1] == '--run':
    f = os.path.abspath(sys.argv[2])
    code = f"__file__ = {f!r}\nexec(compile(open(__file__).read(), __file__, 'exec'))"
else:
    code = sys.stdin.read()
s = socket.create_connection(('127.0.0.1', 9876), timeout=600)
s.sendall(json.dumps({'type': 'execute', 'strict_json': False, 'code': code}).encode() + b'\0')
buf = b''
while not buf.endswith(b'\0'):
    chunk = s.recv(65536)
    if not chunk: break
    buf += chunk
r = json.loads(buf.rstrip(b'\0'))
print(r.get('stdout', ''), end='')
if r.get('stderr'): print(r['stderr'], file=sys.stderr, end='')
if r.get('status') != 'ok': print('ERROR:', r.get('message'), file=sys.stderr); sys.exit(1)
