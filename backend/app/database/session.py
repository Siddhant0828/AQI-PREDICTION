from motor.motor_asyncio import AsyncIOMotorClient

from app.config.settings import settings

client = AsyncIOMotorClient(settings.mongodb_uri)
db = client[settings.mongodb_db_name]

async def get_db():
    yield db
