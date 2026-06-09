import asyncio
from app.services.supabase_service import supabase_service

async def get_schema():
    res = supabase_service.client.table('evaluaciones').select('*').limit(1).execute()
    print(res.data)

asyncio.run(get_schema())

