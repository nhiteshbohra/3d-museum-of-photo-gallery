"""Real-time WebSocket synchronization server for Our Home 3D.
Enables instant multiplayer movement, animation, and interaction synchronization
between separate browser windows, tabs, and remote mobile phones.
"""
import asyncio
import json
import logging
from websockets.server import serve

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')

# Room storage: { room_id: { websocket_client: peer_info } }
ROOMS = {}

async def broadcast_to_room(room_id, message, sender_ws):
    if room_id not in ROOMS:
        return
    dead_clients = []
    for client in ROOMS[room_id]:
        if client != sender_ws:
            try:
                await client.send(message)
            except Exception:
                dead_clients.append(client)
    for dc in dead_clients:
        ROOMS[room_id].pop(dc, None)

async def handler(websocket):
    peer_room = 'our-home'
    peer_id = None
    peer_role = 'guest'
    
    try:
        async for raw_message in websocket:
            try:
                data = json.loads(raw_message)
            except Exception:
                continue
                
            msg_type = data.get('type')
            
            if msg_type == 'join':
                peer_room = data.get('room', 'our-home')
                peer_id = data.get('peerId')
                peer_role = data.get('role', 'guest')
                
                if peer_room not in ROOMS:
                    ROOMS[peer_room] = {}
                ROOMS[peer_room][websocket] = {'peerId': peer_id, 'role': peer_role}
                
                count = len(ROOMS[peer_room])
                logging.info(f"Client {peer_id} joined room '{peer_room}' as {peer_role}. Total: {count}")
                
                # Send acknowledgement and peer count
                await websocket.send(json.dumps({
                    'type': 'room_state',
                    'room': peer_room,
                    'peerCount': count,
                    'peers': [p['role'] for p in ROOMS[peer_room].values()]
                }))
                
                # Notify peers in the room
                await broadcast_to_room(peer_room, json.dumps({
                    'type': 'peer_joined',
                    'peerId': peer_id,
                    'role': peer_role,
                    'peerCount': count
                }), websocket)
                
            elif msg_type in ('sync', 'interaction', 'chat', 'dance_invite', 'dance_accept'):
                # Relay state or interaction directly to other peers in room
                await broadcast_to_room(peer_room, raw_message, websocket)
                
    except Exception as e:
        logging.warning(f"Connection error: {e}")
    finally:
        if peer_room in ROOMS and websocket in ROOMS[peer_room]:
            ROOMS[peer_room].pop(websocket, None)
            count = len(ROOMS[peer_room])
            logging.info(f"Client {peer_id} disconnected from '{peer_room}'. Remaining: {count}")
            await broadcast_to_room(peer_room, json.dumps({
                'type': 'peer_left',
                'peerId': peer_id,
                'role': peer_role,
                'peerCount': count
            }), websocket)

async def main():
    port = 8081
    logging.info(f"Starting Our Home 3D Multiplayer Sync Server on ws://0.0.0.0:{port}...")
    async with serve(handler, "0.0.0.0", port):
        await asyncio.Future() # run forever

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass

