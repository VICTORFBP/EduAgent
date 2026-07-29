"""Quick smoke test for new blockquote components in the PDF generator."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.pdf_generator import _markdown_to_typst

# Test RELACION
md_relacion = """> 📋 RELACION
> Concepto ↔ Definición
> Fotosíntesis | Proceso de producir alimento
> Respiración | Intercambio de gases
> Nutrición | Obtención de alimentos
"""
result = _markdown_to_typst(md_relacion)
assert '#relacion(' in result, f"RELACION not found: {result[:200]}"
print("✅ RELACION ok")

# Test COMPLETAR
md_completar = """> 🧩 COMPLETAR
> La ___ es un proceso que ocurre en las ___ de las plantas.
> Necesita agua y ___ para funcionar.
"""
result = _markdown_to_typst(md_completar)
assert '#completar-texto[' in result, f"COMPLETAR not found: {result[:200]}"
print("✅ COMPLETAR ok")

# Test ORDENAR
md_ordenar = """> 📝 ORDENAR
> Ordena los pasos del ciclo del agua:
> Evaporación
> Condensación
> Precipitación
> Escorrentía
"""
result = _markdown_to_typst(md_ordenar)
assert '#ordenar(' in result, f"ORDENAR not found: {result[:200]}"
print("✅ ORDENAR ok")

# Test CORREGIR
md_corregir = """> ✏️ CORREGIR
> "Las plantas nesesitan luz para aser la fotosintecis."
"""
result = _markdown_to_typst(md_corregir)
assert '#corregir-texto[' in result, f"CORREGIR not found: {result[:200]}"
print("✅ CORREGIR ok")

# Test ESCALA
md_escala = """> 🔢 ESCALA
> Mucho | Algo | Poco | Nada
> Entiendo el tema
> Puedo explicar el tema
> Me siento seguro
"""
result = _markdown_to_typst(md_escala)
assert '#escala(' in result, f"ESCALA not found: {result[:200]}"
print("✅ ESCALA ok")

# Test existing components still work
md_recuadro = """> 📦 RECUADRO
> **Concepto clave**
> La fotosíntesis es importante.
"""
result = _markdown_to_typst(md_recuadro)
assert '#recuadro' in result, f"RECUADRO not found: {result[:200]}"
print("✅ RECUADRO ok")

md_fragmento = """> 📖 FRAGMENTO
> En un pueblo de Colombia...
"""
result = _markdown_to_typst(md_fragmento)
assert '#fragmento-lectura[' in result, f"FRAGMENTO not found: {result[:200]}"
print("✅ FRAGMENTO ok")

md_dibujo = """> 🎨 DIBUJO
> Dibuja el ciclo del agua
"""
result = _markdown_to_typst(md_dibujo)
assert '#dibujo[' in result, f"DIBUJO not found: {result[:200]}"
print("✅ DIBUJO ok")

print("\n🎉 All component tests passed!")
