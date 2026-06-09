import json
import os

BACKUP_DIR = r"c:\Users\admin\Documents\Proyectos\EduAgent\n8n_backups"

files = [
    ("EduAgent_Actividad_General_EzYiDzu8IYTvv56L.json", "ActivityAgentGeneral"),
    ("EduAgent_Actividad_Matematicas_spnDlvMJdmA1Cdu9.json", "ActivityAgentMath"),
    ("EduAgent_Actividad_Lenguaje_ubDxiebseBzaDyD6.json", "ActivityAgentLanguage")
]

def add_rag_to_workflow(file_path, agent_node_name):
    with open(file_path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    # Transform the main LLM chain node into an AIAgent node
    agent_node = next((n for n in wf["nodes"] if n["name"] == agent_node_name), None)
    if agent_node:
        agent_node["type"] = "@n8n/n8n-nodes-langchain.agent"
        agent_node["typeVersion"] = 1.5
        
        # Keep original text prompt to split it into systemMessage and text
        original_text = agent_node["parameters"].get("text", "")
        
        # Extract everything before "RESPONDE ÚNICAMENTE"
        split_marker = "RESPONDE ÚNICAMENTE"
        parts = original_text.split(split_marker)
        
        text_input = parts[0].strip()
        system_msg = f"Eres un asistente pedagógico experto. Utiliza la herramienta 'buscar_documentos' para consultar los estándares y contenido curricular si lo necesitas.\n\n{split_marker} {parts[1] if len(parts) > 1 else ''}".strip()

        agent_node["parameters"] = {
            "agent": "toolsAgent",
            "promptType": "define",
            "text": text_input,
            "options": {
                "systemMessage": system_msg
            }
        }

    # Add the RAG tool nodes
    new_nodes = [
      {
        "parameters": {
          "name": "buscar_documentos",
          "description": "Herramienta de búsqueda en documentos curriculares y pedagógicos. Úsala para enriquecer la actividad."
        },
        "id": "tool_rag",
        "name": "VectorStoreTool",
        "position": [400, 192],
        "type": "@n8n/n8n-nodes-langchain.toolVectorStore",
        "typeVersion": 1
      },
      {
        "parameters": {
          "tableName": "document_chunks",
          "options": {}
        },
        "id": "supa_vec",
        "name": "SupabaseVector",
        "position": [208, 336],
        "type": "@n8n/n8n-nodes-langchain.vectorStoreSupabase",
        "typeVersion": 1,
        "credentials": {
          "supabaseApi": {
            "id": "hdMca8ziAD6HN8DO",
            "name": "Supabase account"
          }
        }
      },
      {
        "parameters": {
          "options": {}
        },
        "id": "embed_openai",
        "name": "Embeddings",
        "position": [16, 464],
        "type": "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
        "typeVersion": 1.2,
        "credentials": {
          "openAiApi": {
            "id": "Jowod5NKcwNTE2fL",
            "name": "OpenAI account"
          }
        }
      },
      {
        "parameters": {
          "model": "gpt-4o-mini",
          "options": {}
        },
        "id": "chat_tool",
        "name": "ChatOpenAITool",
        "position": [592, 384],
        "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
        "typeVersion": 1.1,
        "credentials": {
          "openAiApi": {
            "id": "Jowod5NKcwNTE2fL",
            "name": "OpenAI account"
          }
        }
      }
    ]
    
    # Avoid duplicate additions
    existing_node_names = [n["name"] for n in wf["nodes"]]
    for n in new_nodes:
        if n["name"] not in existing_node_names:
            wf["nodes"].append(n)

    # Update connections
    conn = wf.get("connections", {})
    if "ChatOpenAITool" not in conn:
        conn["ChatOpenAITool"] = {
            "ai_languageModel": [[{"index": 0, "node": "VectorStoreTool", "type": "ai_languageModel"}]]
        }
    if "Embeddings" not in conn:
        conn["Embeddings"] = {
            "ai_embedding": [[{"index": 0, "node": "SupabaseVector", "type": "ai_embedding"}]]
        }
    if "SupabaseVector" not in conn:
        conn["SupabaseVector"] = {
            "ai_vectorStore": [[{"index": 0, "node": "VectorStoreTool", "type": "ai_vectorStore"}]]
        }
    if "VectorStoreTool" not in conn:
        conn["VectorStoreTool"] = {
            "ai_tool": [[{"index": 0, "node": agent_node_name, "type": "ai_tool"}]]
        }

    wf["connections"] = conn

    # Remove autosaved and specific active version stuff to just let n8n import cleanly
    # if "activeVersion" in wf:
    #     del wf["activeVersion"]

    out_file = os.path.join(BACKUP_DIR, f"updated_{os.path.basename(file_path)}")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)
    print(f"Created updated RAG workflow: {out_file}")

for f, a in files:
    full_path = os.path.join(BACKUP_DIR, f)
    add_rag_to_workflow(full_path, a)
