from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.connection import ConnectionManager

router = APIRouter()
manager = ConnectionManager()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            target_id = data.get("target_id")
            message = data.get("message")
            
            if target_id and message:
                response = {
                    "sender": client_id,
                    "message": message,
                    "type": "chat"
                }
                print(response)
                await manager.send_personal_json(response, target_id)
            else:
                await manager.send_personal_message("Invalid data format", client_id)
                
    except WebSocketDisconnect:
        manager.disconnect(client_id)