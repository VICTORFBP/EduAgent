import json
import os

STEPS_DIR = r"C:\Users\admin\.gemini\antigravity-ide\brain\ca887611-b8a1-4962-827b-f8e2c0df8fa4\.system_generated\steps"
BACKUP_DIR = r"c:\Users\admin\Documents\Proyectos\EduAgent\n8n_backups"

os.makedirs(BACKUP_DIR, exist_ok=True)

files = {
    "EduAgent_Actividad_General_EzYiDzu8IYTvv56L.json": "30",
    "EduAgent_Actividad_Matematicas_spnDlvMJdmA1Cdu9.json": "31",
    "EduAgent_Actividad_Lenguaje_ubDxiebseBzaDyD6.json": "32"
}

for name, step in files.items():
    src = os.path.join(STEPS_DIR, step, "output.txt")
    dst = os.path.join(BACKUP_DIR, name)
    try:
        with open(src, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        workflow = data.get("data", data)
        with open(dst, "w", encoding="utf-8") as f:
            json.dump(workflow, f, indent=2, ensure_ascii=False)
        print(f"Backed up {name}")
    except Exception as e:
        print(f"Error processing {name}: {e}")
