import asyncio
import uuid
import json
from app.services.n8n_service import n8n_service
from app.routers.planeacion import _get_skill_context
from app.services.supabase_service import supabase_service

async def run_tests():
    print("=== Iniciando prueba de webhooks de n8n ===")
    
    area = "Ciencias Naturales"
    grados = [4, 5]
    tema = "El ciclo del agua"
    tipo_actividad = "taller"
    
    # Obtenemos el contexto de la habilidad tal como lo hace la API
    skill_context = _get_skill_context(area)
    
    # Obtener un docente_id válido de la base de datos
    docentes_res = supabase_service.client.table("docentes").select("id").limit(1).execute()
    if not docentes_res.data:
        print("ERROR: No se encontro ningun docente en la base de datos para asignar la planeacion.")
        return
    docente_id = docentes_res.data[0]["id"]
    print(f"Usando docente_id valido: {docente_id}")
    
    # 1. Crear Planeación
    print(f"\n1. Solicitando Planeación para tema '{tema}'...")
    try:
        raw_plan = await n8n_service.trigger_planeacion(
            area=area,
            grados=grados,
            tema=tema,
            duracion=45,
            recursos="Pizarra, cuaderno, colores, proyector",
            docente_id=docente_id,
            tipo_actividad=tipo_actividad,
            skill_context=skill_context
        )
        
        # Dependiendo de n8n, a veces devuelve una lista con el objeto
        plan_data = raw_plan[0] if isinstance(raw_plan, list) and len(raw_plan) > 0 else raw_plan
        contenido_generado = plan_data.get("contenido_generado")
        
        if not contenido_generado:
            print("ERROR: La respuesta de la planeacion no contiene 'contenido_generado'.")
            print("Respuesta:", json.dumps(plan_data, indent=2, ensure_ascii=False))
            return
            
        print("OK: Planeacion generada exitosamente.")
        # print(json.dumps(contenido_generado, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"ERROR al generar planeacion: {e}")
        return

    # Obtener el ID de la planeación que n8n guardó en la base de datos
    planeacion_id = plan_data.get("id")
    if not planeacion_id:
        print("ERROR: n8n no devolvió un 'id' de planeación válido.")
        return

    print(f"OK: Planeación guardada por n8n con ID: {planeacion_id}")

    # Esperamos un par de segundos antes de continuar
    print("Esperando 5 segundos antes de generar la actividad...")
    await asyncio.sleep(5)

    # 2. Generar Actividad
    print("\n2. Solicitando Generacion de Actividad a partir de la planeacion...")
    
    try:
        raw_act = await n8n_service.trigger_generar_actividad(
            planeacion_id=planeacion_id,
            area=area,
            grados=grados,
            tema=tema,
            contenido_generado=contenido_generado,
            tipo_actividad=tipo_actividad,
            skill_context=skill_context
        )
        
        act_data = raw_act[0] if isinstance(raw_act, list) and len(raw_act) > 0 else raw_act
        
        print("OK: Actividad generada exitosamente.")
        
        # Guardar en archivos para fácil revisión
        with open("resultado_test_planeacion.json", "w", encoding="utf-8") as f:
            json.dump(plan_data, f, indent=2, ensure_ascii=False)
            
        with open("resultado_test_actividad.json", "w", encoding="utf-8") as f:
            json.dump(act_data, f, indent=2, ensure_ascii=False)
            
        print("\nOK: Resultados guardados en 'resultado_test_planeacion.json' y 'resultado_test_actividad.json'")

    except Exception as e:
        print(f"ERROR al generar actividad: {e}")
        return

if __name__ == "__main__":
    asyncio.run(run_tests())
