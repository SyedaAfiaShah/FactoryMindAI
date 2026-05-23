import os
import asyncio
from typing import Dict, List, Any, Optional
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(override=True)

class SupabaseService:
    """Singleton service for interacting with Supabase."""
    _instance: Optional['SupabaseService'] = None
    _client: Client = None

    def __new__(cls) -> 'SupabaseService':
        if cls._instance is None:
            cls._instance = super(SupabaseService, cls).__new__(cls)
            url: str = os.environ.get("SUPABASE_URL", "")
            key: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
            cls._client = create_client(url, key)
        return cls._instance

    @property
    def client(self) -> Client:
        """Returns the Supabase client instance."""
        return self._client

    async def insert_row(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inserts a row into the specified table.
        
        Args:
            table: The name of the table.
            data: The data to insert.
            
        Returns:
            The inserted row data.
        """
        # Run synchronous insert request in a thread pool to avoid blocking the event loop
        response = await asyncio.to_thread(self._client.table(table).insert(data).execute)
        return response.data[0] if response.data else {}

    async def fetch_rows(self, table: str, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Fetches rows from the specified table with optional filters.
        
        Args:
            table: The name of the table.
            filters: Dictionary of filters (equality check).
            
        Returns:
            List of matching rows.
        """
        query = self._client.table(table).select("*")
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        
        # Run synchronous select request in a thread pool
        response = await asyncio.to_thread(query.execute)
        return response.data

    async def delete_row(self, table: str, row_id: str) -> bool:
        """
        Deletes a row from the specified table by ID.
        
        Args:
            table: The name of the table.
            row_id: The ID of the row to delete.
            
        Returns:
            True if deletion was successful.
        """
        # Run synchronous delete request in a thread pool
        response = await asyncio.to_thread(self._client.table(table).delete().eq("id", row_id).execute)
        return len(response.data) > 0

# Global instance for easy import
supabase_service = SupabaseService()

