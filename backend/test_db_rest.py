import os
import json
import urllib.request
import urllib.error

# Cargar configuración básica leyendo el archivo .env manualmente para no depender de python-dotenv
url = None
key = None

try:
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_URL="):
                url = line.split("=", 1)[1]
            elif line.startswith("SUPABASE_SERVICE_KEY="):
                key = line.split("=", 1)[1]
except FileNotFoundError:
    print("❌ No se encontró el archivo .env")
    exit(1)

if not url or not key or key == "your_supabase_service_role_key":
    print("❌ Error: SUPABASE_URL o SUPABASE_SERVICE_KEY no están configurados correctamente en .env")
    exit(1)

# Endpoint REST de Supabase (PostgREST)
endpoint = f"{url}/rest/v1/docentes?select=*"

req = urllib.request.Request(endpoint)
req.add_header("apikey", key)
req.add_header("Authorization", f"Bearer {key}")

try:
    print(f"Intentando conectar a: {url}")
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        print("✅ ¡Conexión REST exitosa!")
        print(f"✅ Autenticación con service_role exitosa.")
        print(f"Respuesta de la BD (docentes): {data}")
except urllib.error.HTTPError as e:
    print(f"❌ Error HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"❌ Falló la conexión: {e}")
