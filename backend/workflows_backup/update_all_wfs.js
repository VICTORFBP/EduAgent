const fs = require('fs');

const PROMPT = `Eres un asistente pedagógico experto de EduAgent.

REGLAS DE BÚSQUEDA Y CONTENIDO (¡OBLIGATORIAS!):
1. Utiliza SIEMPRE 'buscar_documentos' para consultar estándares si se te pide.
2. DEBES utilizar la herramienta 'Wikipedia' OBLIGATORIAMENTE para investigar conceptos, problemas o temas reales antes de redactarlos. Asegúrate de incluir detalles auténticos obtenidos de la búsqueda.
3. Una vez obtenida la información real, usa tu conocimiento interno para expandir y redactar el texto con lenguaje apropiado para los niños.

REGLA DE RAZONAMIENTO Y EXTENSIÓN (¡CRÍTICO!):
- El usuario quiere CALIDAD y PROFUNDIDAD.
- Antes de entregar el JSON final, DEBES hacer un bloque <thinking> ... </thinking> para reflexionar sobre lo que pidió el docente. Planifica detalladamente.
- El texto que generes (lecturas, cuentos, explicaciones teóricas) DEBE ser muy detallado, extenso (mínimo 3 o 4 párrafos bien desarrollados) y contener explicaciones conceptuales.

REGLA DE VARIEDAD (¡NUEVA!):
- Asegúrate de MEZCLAR diferentes tipos de actividades dentro de un MISMO grado. No limites un grado a un solo tipo de ejercicio.
- Por ejemplo, en un mismo grado incluye un fragmento de lectura + verdadero/falso + dibujo + preguntas abiertas. La variedad es clave.

ESTRUCTURA DE RESPUESTA:
Primero, escribe tu proceso de pensamiento detallado en texto plano.
Luego, responde con el objeto JSON, con estos campos:
1. titulo (string)
2. instrucciones (string Markdown breve)
3. contenido_grados (objeto grado→string Markdown, SIN respuestas. AQUÍ PONES EL TEXTO EXTENSO Y LAS ACTIVIDADES VARIADAS).
4. clave_respuestas (si es un taller: string Markdown; si es selección múltiple: JSON {"1": "A", ...})

IMPORTANTE PARA EL JSON: Usa OBLIGATORIAMENTE la etiqueta <SALTO> para separar filas de tablas. NUNCA uses \\n dentro de las tablas.`;

// LENGUAJE
const lFile = 'c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_updated_4.json';
const wfL = JSON.parse(fs.readFileSync(lFile, 'utf8'));
const agentL = wfL.nodes.find(n => n.name === 'ActivityAgentLanguage');
agentL.parameters.options.systemMessage = PROMPT;
fs.writeFileSync('c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/lenguaje_workflow_updated_5.json', JSON.stringify(wfL, null, 2));

// MATH
const mFile = 'c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/matematicas_workflow_backup.json';
const wfM = JSON.parse(fs.readFileSync(mFile, 'utf8'));
const agentM = wfM.nodes.find(n => n.name === 'ActivityAgentMath');
agentM.parameters.options.systemMessage = PROMPT;
if (!wfM.nodes.find(n => n.name === 'Wikipedia')) {
    wfM.nodes.push({
        "parameters": { "language": "es" },
        "id": "wikipedia-tool-uuid",
        "name": "Wikipedia",
        "type": "@n8n/n8n-nodes-langchain.toolWikipedia",
        "typeVersion": 1,
        "position": [400, 80]
    });
    wfM.connections['Wikipedia'] = {
        "ai_tool": [ [ { "node": "ActivityAgentMath", "type": "ai_tool", "index": 0 } ] ]
    };
}
fs.writeFileSync('c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/matematicas_workflow_updated.json', JSON.stringify(wfM, null, 2));

// GENERAL
const gFile = 'c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/general_workflow_backup.json';
const wfG = JSON.parse(fs.readFileSync(gFile, 'utf8'));
const agentG = wfG.nodes.find(n => n.name === 'ActivityAgentGeneral');
agentG.parameters.options.systemMessage = PROMPT;
if (!wfG.nodes.find(n => n.name === 'Wikipedia')) {
    wfG.nodes.push({
        "parameters": { "language": "es" },
        "id": "wikipedia-tool-uuid",
        "name": "Wikipedia",
        "type": "@n8n/n8n-nodes-langchain.toolWikipedia",
        "typeVersion": 1,
        "position": [400, 80]
    });
    wfG.connections['Wikipedia'] = {
        "ai_tool": [ [ { "node": "ActivityAgentGeneral", "type": "ai_tool", "index": 0 } ] ]
    };
}
fs.writeFileSync('c:/Users/admin/Documents/Proyectos/EduAgent/backend/workflows_backup/general_workflow_updated.json', JSON.stringify(wfG, null, 2));

console.log('Done');
