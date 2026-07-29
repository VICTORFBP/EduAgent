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
- Adapta la cantidad de ejercicios a lo que solicite el docente. Si no se especifica, usa entre 5 y 8 ítems de actividad por grado.
- Diferencia claramente el contenido de cada grado (no repitas ejercicios idénticos)

## Separación de secciones
- Separa secciones con `---` (línea horizontal)
- Usa `## Nombre de Sección` para secciones principales y `### Nombre` para subsecciones

## Encabezado del documento
El template genera automáticamente el encabezado con:
Nombre del estudiante | Grado | Fecha | Área | Tema | Nota

No repliques este encabezado en el contenido.

---

## DIVERSIDAD ESTRUCTURAL (OBLIGATORIO)

**Cada actividad que generes debe ser única en su estructura.** No sigas un patrón fijo ni repitas la misma secuencia de secciones entre generaciones. Los componentes disponibles son herramientas que puedes combinar libremente.

### Reglas de diversidad:
1. **No repitas la misma estructura**: Si la actividad anterior tenía "lectura → preguntas → V/F → producción escrita", la siguiente debe usar una combinación diferente.
2. **Varía los tipos de ejercicio**: No uses solo preguntas abiertas, ni solo selección múltiple. Mezcla al menos 2-3 tipos diferentes.
3. **Adapta al tema**: Un tema de ciencias puede necesitar espacio de dibujo y observación. Un tema de lenguaje puede necesitar corrección de texto y producción escrita. Un tema de matemáticas puede necesitar grillas de operaciones y problemas contextualizados.
4. **Progresión dentro de la actividad**: Los ejercicios deben variar en dificultad (de más simple a más complejo, o de reconocimiento a aplicación).
5. **El número de secciones es flexible**: Puede ser 2 secciones profundas o 5 secciones breves, según lo que el tema requiera. NO te obligues a tener siempre el mismo número.
6. **Los títulos de sección deben ser descriptivos**: En lugar de "Sección 1", usa títulos que reflejen lo que se evaluará ("Comprensión lectora", "Resolución de problemas", "Aplicación al contexto", etc.)

### Lo que NO debes hacer:
- Seguir siempre el patrón: recuadro → preguntas → tabla → reflexión
- Usar los mismos tipos de ejercicio en el mismo orden
- Generar actividades que parezcan plantillas genéricas
- Comenzar siempre con la misma frase o sección introductoria

---

## PROHIBIDO absolutamente
- Etiquetas HTML (`<br>`, `<b>`, `<div>`, `<style>`, `<table>`, etc.)
- CSS o clases de estilo
- `&nbsp;` u otras entidades HTML
- Incluir las respuestas correctas en `contenido_grados`
- Usar `#` nivel 1 de encabezado (reservado para el título principal)

## SERIALIZACIÓN JSON (CRÍTICO)
Al generar tu respuesta en JSON, debes respetar estrictamente el formato Markdown para tablas y listas.
- **Saltos de línea en tablas**: Las IAs suelen romper las tablas al omitir los saltos de línea para proteger el JSON. Para evitar esto, DEBES separar cada fila de tu tabla usando la etiqueta `<SALTO>`.
  - ❌ INCORRECTO: `"| A | B ||---|---|| 1 | 2 |"`
  - ✅ CORRECTO: `"| A | B |<SALTO>|---|---|<SALTO>| 1 | 2 |"`
- **⚠️ `<SALTO>` es SOLO para tablas `|...|`**: NUNCA uses `<SALTO>` dentro de bloques `> 📦 GRILLA`. En la GRILLA, cada ítem va en su propia línea con `\n> ` (salto de línea real + `> `).
  - ❌ INCORRECTO en GRILLA: `"> 📦 GRILLA\n> $3 \\times 4 =$ ___<SALTO>$5 \\times 6 =$ ___"`
  - ✅ CORRECTO en GRILLA: `"> 📦 GRILLA\n> $3 \\times 4 =$ ___\n> $5 \\times 6 =$ ___"`
- **Comandos LaTeX**: Debes escapar la barra invertida en los comandos de LaTeX usando doble barra `\\` (ejemplo: `$\\sqrt{25}$`, `$\\frac{1}{2}$`).
