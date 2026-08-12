#!/bin/bash
# ==========================================
# EDUAGENT DESPLIEGUE (VPS CONTABO)
# ==========================================
# Este script actualiza el repositorio y reinicia los contenedores.
# Asegúrate de ejecutarlo desde la raíz del proyecto.

set -e # Detener el script si hay algún error

echo "🚀 Iniciando proceso de despliegue de EduAgent..."

# 1. Obtener los últimos cambios de la rama actual (ej: main o agent)
echo "📥 Descargando últimos cambios de GitHub..."
git fetch origin
git pull

# 2. Reconstruir las imágenes de Docker y levantar los contenedores
# -d: Detached (segundo plano)
# --build: Fuerza la reconstrucción de las imágenes
# --remove-orphans: Limpia contenedores viejos
echo "🏗️ Construyendo imágenes y levantando contenedores..."
docker compose up -d --build --remove-orphans

# 3. Limpiar imágenes colgadas para ahorrar espacio en disco
echo "🧹 Limpiando imágenes sin uso (ahorrando espacio en disco)..."
docker image prune -f

echo "✅ ¡Despliegue completado con éxito!"
echo "🔍 Puedes revisar los logs con: docker compose logs -f"
