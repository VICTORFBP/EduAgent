# Normas Generales de Formato — EduAgent (Typst PDF)

## Pipeline de salida
El Markdown que generes se compilará con **Typst** para producir un PDF imprimible.
El sistema convierte automáticamente el Markdown estructurado a los componentes visuales del PDF.

## Papel y márgenes
- Papel: **Carta** (216 × 279 mm / 8.5 × 11 in)
- Márgenes: 2 cm arriba/abajo, 2.5 cm izquierda/derecha (aplicados por el template)

## Tipografía
- Fuente: Sans-serif (Arial/Liberation Sans) — definida en el template
- No es necesario especificar fuentes; el template las aplica automáticamente
- Usa `**negrita**` y `*cursiva*` solo para énfasis real

## Densidad del contenido
- El contenido debe llenar de manera natural al menos el 70% de la página
- No incluyas saltos de línea vacíos consecutivos innecesarios
- Cada sección debe tener entre 5 y 8 ítems de actividad por grado
- Diferencia claramente el contenido de cada grado (no repitas ejercicios idénticos)

## Separación de secciones
- Separa secciones con `---` (línea horizontal)
- Usa `## Nombre de Sección` para secciones principales y `### Nombre` para subsecciones

## Encabezado del documento
El template genera automáticamente el encabezado con:
Nombre del estudiante | Grado | Fecha | Área | Tema | Nota

No repliques este encabezado en el contenido.

## PROHIBIDO absolutamente
- Etiquetas HTML (`<br>`, `<b>`, `<div>`, `<style>`, `<table>`, etc.)
- CSS o clases de estilo
- `&nbsp;` u otras entidades HTML
- Incluir las respuestas correctas en `contenido_grados`
- Usar `#` nivel 1 de encabezado (reservado para el título principal)
