from supabase import create_client, Client
from config import get_settings

settings = get_settings()

# Store database instance
_db_instance: Client = None


def get_db_instance() -> Client:
    """Get or create Supabase client instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
    return _db_instance


def get_db() -> Client:
    """Dependency for getting database client"""
    return get_db_instance()
