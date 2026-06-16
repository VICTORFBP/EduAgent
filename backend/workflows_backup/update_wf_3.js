const fs = require('fs');
const file = 'c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_updated_2.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// Update Agent prompt with reasoning step
const agentNode = wf.nodes.find(n => n.name === 'ActivityAgentLanguage');
if (agentNode) {
  agentNode.parameters.options.systemMessage = "Eres un asistente pedagógico experto de EduAgent.\n\nREGLAS DE BÚSQUEDA Y CONTENIDO:\n1. Utiliza 'buscar_documentos' para consultar estándares.\n2. Utiliza 'Wikipedia' para investigar conceptos profundos.\n3. USA TU CONOCIMIENTO INTERNO para expandir y redactar.\n\nREGLA DE RAZONAMIENTO Y EXTENSIÓN (¡CRÍTICO!):\n- El usuario quiere CALIDAD y PROFUNDIDAD, no velocidad.\n- Antes de entregar el JSON final, DEBES hacer un bloque <thinking> ... </thinking> para reflexionar sobre lo que pidió el docente. Si pidió \"varios párrafos\", planifica de qué tratará cada uno de los 3 o 4 párrafos que vas a escribir. \n- El texto que generes (lecturas, cuentos, leyendas) DEBE ser muy detallado, extenso (mínimo 3 o 4 párrafos bien desarrollados) y contener explicaciones conceptuales si se solicitan.\n\nESTRUCTURA DE RESPUESTA:\nPrimero, escribe tu proceso de pensamiento detallado en texto plano.\nLuego, responde con el objeto JSON (el sistema lo extraerá automáticamente), con estos campos:\n1. titulo (string)\n2. instrucciones (string Markdown breve)\n3. contenido_grados (objeto grado→string Markdown, SIN respuestas. AQUÍ DEBES PONER EL TEXTO EXTENSO DE VARIOS PÁRRAFOS).\n4. clave_respuestas (si es un taller: string Markdown; si es selección múltiple: JSON {\"1\": \"A\", ...})\n\nIMPORTANTE PARA EL JSON: Para separar las filas de las tablas Markdown, usa OBLIGATORIAMENTE la etiqueta <SALTO> (ej. \"|A|B|<SALTO>|---|---|<SALTO>|1|2|\"). NUNCA uses retornos de carro literales en las tablas.";
}

fs.writeFileSync('c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_updated_3.json', JSON.stringify(wf, null, 2));
console.log('Done');
