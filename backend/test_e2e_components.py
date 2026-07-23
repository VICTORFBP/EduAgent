"""E2E test: Markdown with new components -> Typst -> PDF compilation."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.pdf_generator import pdf_generator_service

# Simulate an activity with the new components
actividad = {
    "titulo": "Actividad de Ciencias Naturales",
    "instrucciones": "Lee cada sección y responde con cuidado.",
    "contenido_grados": {
        "3": """## Comprensión del ciclo del agua

> 📖 FRAGMENTO
> El ciclo del agua es un proceso natural que ocurre constantemente en nuestro planeta.
> El sol calienta el agua de los ríos, mares y lagos, y esta se evapora hacia la atmósfera.
> Cuando el vapor se enfría, se condensa y forma las nubes. Luego cae como lluvia.

**1.** Según el fragmento, ¿qué calienta el agua?

A. [ ] La luna
B. [ ] El sol
C. [ ] El viento
D. [ ] Las nubes

---

## Ordena el proceso

> 📝 ORDENAR
> Ordena los pasos del ciclo del agua:
> El agua se evapora
> El vapor forma nubes
> Cae la lluvia
> El agua llega a los ríos

---

## Completa el texto

> 🧩 COMPLETAR
> El ___ calienta el agua de los ríos y mares. El agua se ___ y sube a la atmósfera.
> Cuando el vapor se enfría, se ___ y forma las ___. Después cae como ___.

---

## Relaciona conceptos

> 📋 RELACION
> Proceso ↔ Descripción
> Evaporación | El agua líquida se convierte en vapor
> Condensación | El vapor de agua se convierte en gotas
> Precipitación | El agua cae de las nubes
> Escorrentía | El agua corre por la superficie

---

## Encuentra los errores

> ✏️ CORREGIR
> "El ciclo del agua comienza cuando la luna calienta los ríos.
> El agua se condenfa y forma las nuves. Despues cae como nieve siempre."

---

## Reflexión

¿Por qué es importante el ciclo del agua para los cultivos de tu comunidad?

[LINEAS:5]

---

## Autoevaluación

> 🔢 ESCALA
> Mucho | Algo | Poco | Nada
> Entiendo qué es el ciclo del agua
> Puedo explicar cada paso del ciclo
> Puedo dibujar el ciclo del agua
""",
    },
    "clave_respuestas": "",
}

plan = {
    "area": "Ciencias Naturales",
    "tema": "El ciclo del agua",
}

import asyncio

async def main():
    try:
        pdf_bytes = await pdf_generator_service.generate_pdf(actividad, plan, grado=3)
        out_path = os.path.join(os.path.dirname(__file__), 'app', '.typst_tmp', 'test_e2e_output.pdf')
        with open(out_path, 'wb') as f:
            f.write(pdf_bytes)
        print(f"OK: PDF generated successfully ({len(pdf_bytes)} bytes)")
        print(f"Saved to: {out_path}")
    except Exception as e:
        print(f"ERROR: {e}")
        # Dump the typst source for debugging
        import traceback
        traceback.print_exc()
        raise

asyncio.run(main())
