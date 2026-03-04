import os
import json
import asyncio
from fastapi import WebSocket
import redis.asyncio as redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.redis: redis.Redis | None = None
        self.pubsub = None
        self.listen_task: asyncio.Task | None = None

    async def connect_redis(self):
        self.redis = redis.from_url(REDIS_URL, decode_responses=True)
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe("chat_channel")
        self.listen_task = asyncio.create_task(self._listen())

    async def disconnect_redis(self):
        if self.listen_task:
            self.listen_task.cancel()
        if self.pubsub:
            await self.pubsub.unsubscribe("chat_channel")
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()

    async def _listen(self):
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    target_id = data.get("target_id")
                    payload = data.get("payload")
                    if target_id and target_id in self.active_connections:
                        ws = self.active_connections[target_id]
                        await ws.send_json(payload)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Redis listen error: {e}")

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_text(message)

    async def send_personal_json(self, message: dict, user_id: str):
        if self.redis:
            await self.redis.publish("chat_channel", json.dumps({
                "target_id": user_id,
                "payload": message
            }))
        elif user_id in self.active_connections:
            # Fallback local distribution if Redis is disabled
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)

manager = ConnectionManager()