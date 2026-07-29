import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
from app.services.n8n_service import n8n_service
from app.routers.planeacion import _get_skill_context
from app.services.pdf_generator import pdf_generator_service

async def main():
    print("Obteniendo skill_context para Ciencias Naturales...")
    skill_context = _get_skill_context("Ciencias Naturales")
    
    print("\nLlamando a n8n para generar Planeación (esto puede tomar 1-2 minutos por el LLM)...")
    try:
        planeacion_raw = await n8n_service.trigger_planeacion(
            area="Ciencias Naturales",
            grados=[4],
            tema="El sistema solar y los planetas",
            duracion=60,
            recursos="Pizarra, marcadores",
            docente_id="c32653ce-360a-4006-bdf8-5eb6d39be326", # Valid UUID from DB
            skill_context=skill_context
        )
        print("\n✅ Planeación generada:")
        # Extraer el contenido
        plan_data = planeacion_raw[0] if isinstance(planeacion_raw, list) else planeacion_raw
        print(f"Tema: {plan_data.get('tema')}")
        
        # Ahora generamos la actividad
        print("\nLlamando a n8n para generar Actividad (esto puede tomar 1-2 minutos)...")
        actividad_raw = await n8n_service.trigger_generar_actividad(
            planeacion_id=plan_data.get('id', "123e4567-e89b-12d3-a456-426614174000"),
            area="Ciencias Naturales",
            grados=[4],
            tema="El sistema solar y los planetas",
            contenido_generado=plan_data.get('contenido_generado', {}),
            skill_context=skill_context
        )
        print("\n✅ Actividad generada con éxito!")
        actividad_data = actividad_raw[0] if isinstance(actividad_raw, list) else actividad_raw
        
        print("\nGenerando PDF con Typst...")
        pdf_bytes = await pdf_generator_service.generate_pdf(
            actividad_data, 
            plan_data, 
            grado=4
        )
        
        out_path = "test_live_activity.pdf"
        with open(out_path, "wb") as f:
            f.write(pdf_bytes)
        print(f"\n🎉 PDF guardado en: {os.path.abspath(out_path)}")
        
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {e}")

if __name__ == "__main__":
    asyncio.run(main())
