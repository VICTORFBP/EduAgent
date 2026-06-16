const fs = require('fs');
const file = 'c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_backup.json';
const wf = JSON.parse(fs.readFileSync(file, 'utf8'));

// Add Wikipedia Node
wf.nodes.push({
  parameters: {
    language: 'es'
  },
  id: 'wikipedia-tool-uuid',
  name: 'Wikipedia',
  type: '@n8n/n8n-nodes-langchain.toolWikipedia',
  typeVersion: 1,
  position: [464, 80]
});

// Update Agent prompt
const agentNode = wf.nodes.find(n => n.name === 'ActivityAgentLanguage');
if (agentNode) {
  agentNode.parameters.options.systemMessage = "Eres un asistente pedagógico experto. Utiliza la herramienta 'buscar_documentos' para consultar los estándares y contenido curricular. Utiliza 'Wikipedia' para buscar información adicional sobre el tema en internet si la información proporcionada es insuficiente.\n\nRESPONDE ÚNICAMENTE  con el objeto JSON sin ```, con estos campos:\n1. titulo (string)\n2. instrucciones (string Markdown breve)\n3. contenido_grados (objeto grado→string Markdown, SIN respuestas)\n4. clave_respuestas (si es un taller/actividad de desarrollo: un string Markdown con soluciones + rúbrica; si es una prueba estandarizada de opción múltiple: obligatoriamente un objeto JSON en formato {\"1\": \"A\", \"2\": \"B\", ...} con la letra correcta de cada pregunta)\n\nIMPORTANTE PARA EL JSON: Para las tablas Markdown, NUNCA escribas la tabla en una sola línea (ej. ❌ \"|A|B||-|-||1|2|\"). Para separar las filas sin romper la sintaxis del JSON, usa OBLIGATORIAMENTE la etiqueta <SALTO> (ej. ✅ \"|A|B|<SALTO>|---|---|<SALTO>|1|2|\").";
}

// Update Connections
wf.connections['Wikipedia'] = {
  ai_tool: [
    [
      {
        node: 'ActivityAgentLanguage',
        type: 'ai_tool',
        index: 0
      }
    ]
  ]
};

fs.writeFileSync('c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_updated.json', JSON.stringify(wf, null, 2));
console.log('Done');
