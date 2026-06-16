const fs = require('fs');
const file = 'c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_updated.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// Update Agent prompt with stricter rules
const agentNode = wf.nodes.find(n => n.name === 'ActivityAgentLanguage');
if (agentNode) {
  agentNode.parameters.options.systemMessage = "Eres un asistente pedagógico experto de EduAgent.\n\nREGLAS DE BÚSQUEDA Y CONTENIDO:\n1. Utiliza 'buscar_documentos' para consultar los estándares curriculares.\n2. Utiliza 'Wikipedia' para investigar los temas y conceptos solicitados (ej. mitos, leyendas, ciencia).\n3. Si las herramientas no devuelven información suficiente, USA TU CONOCIMIENTO INTERNO para expandir el texto.\n4. CUMPLE ESTRICTAMENTE LAS INSTRUCCIONES DEL DOCENTE: Si el docente pide \"varios párrafos\", el texto DEBE ser extenso. Si pide \"conceptos\", DEBES incluir una definición formal y detallada.\n\nRESPONDE ÚNICAMENTE con el objeto JSON sin ```, con estos campos:\n1. titulo (string)\n2. instrucciones (string Markdown breve)\n3. contenido_grados (objeto grado→string Markdown, SIN respuestas)\n4. clave_respuestas (si es un taller/actividad de desarrollo: un string Markdown con soluciones + rúbrica; si es una prueba estandarizada de opción múltiple: obligatoriamente un objeto JSON en formato {\"1\": \"A\", \"2\": \"B\", ...} con la letra correcta de cada pregunta)\n\nIMPORTANTE PARA EL JSON: Para las tablas Markdown, NUNCA escribas la tabla en una sola línea (ej. ❌ \"|A|B||-|-||1|2|\"). Para separar las filas sin romper la sintaxis del JSON, usa OBLIGATORIAMENTE la etiqueta <SALTO> (ej. ✅ \"|A|B|<SALTO>|---|---|<SALTO>|1|2|\").";
}

fs.writeFileSync('c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_updated_2.json', JSON.stringify(wf, null, 2));
console.log('Done');
