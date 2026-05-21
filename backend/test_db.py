import asyncio
from app.services.supabase_service import supabase_service

async def run():
    p = supabase_service.client.table('planeaciones').select('*').limit(5).execute()
    for plan in p.data:
        print(f"ID: {plan['id']}")
        print(f"  Root Keys: {list(plan.keys())}")
        cont = plan.get('contenido_generado', {})
        if isinstance(cont, dict):
            print(f"  Contenido Keys: {list(cont.keys())}")
        print("---")

asyncio.run(run())
