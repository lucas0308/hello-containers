/*
 * WebRTC Signaling Server for Cloudflare Containers
 * Based on libdatachannel example web server
 * Copyright (C) 2020 Lara Mackey
 * Copyright (C) 2020 Paul-Louis Ageneau
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; If not, see <http://www.gnu.org/licenses/>.
 */

const http = require('http');
const websocket = require('websocket');

const clients = {};

const httpServer = http.createServer((req, res) => {
  console.log(`${req.method.toUpperCase()} ${req.url}`);

  const respond = (code, data, contentType = 'text/plain') => {
    res.writeHead(code, {
      'Content-Type' : contentType,
      'Access-Control-Allow-Origin' : '*',
    });
    res.end(data);
  };

  // Handle basic HTTP requests
  if (req.url === '/') {
    respond(200, 'WebRTC Signaling Server is running');
    return;
  }

  if (req.url === '/health') {
    respond(200, 'OK');
    return;
  }

  respond(404, 'Not Found');
});

const wsServer = new websocket.server({httpServer});
wsServer.on('request', (req) => {
  console.log(`WS  ${req.resource}`);

  const {pathname} = req.resourceURL;
  console.log(`WebSocket connection request for path: ${pathname}`);
  
  // Extract client ID from the path
  // Paths can be like /ws/client-id or /client-id
  const pathParts = pathname.split('/').filter(part => part.length > 0);
  let clientId;
  
  if (pathParts.length >= 2 && pathParts[0] === 'ws') {
    // Path like /ws/client-id
    clientId = pathParts[1];
  } else if (pathParts.length >= 1) {
    // Path like /client-id
    clientId = pathParts[0];
  } else {
    console.error('Invalid WebSocket path:', pathname);
    req.reject(400, 'Invalid path');
    return;
  }

  console.log(`Client ${clientId} connecting`);

  const conn = req.accept(null, req.origin);
  
  conn.on('message', (data) => {
    if (data.type === 'utf8') {
      console.log(`Client ${clientId} << ${data.utf8Data}`);

      try {
        const message = JSON.parse(data.utf8Data);
        const destId = message.id;
        const dest = clients[destId];
        
        if (dest && dest.connected) {
          message.id = clientId; // Set sender ID
          const responseData = JSON.stringify(message);
          console.log(`Client ${destId} >> ${responseData}`);
          dest.send(responseData);
        } else {
          console.error(`Client ${destId} not found or not connected`);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    }
  });
  
  conn.on('close', () => {
    delete clients[clientId];
    console.log(`Client ${clientId} disconnected`);
  });

  conn.on('error', (error) => {
    console.error(`Client ${clientId} error:`, error);
    delete clients[clientId];
  });

  clients[clientId] = conn;
  console.log(`Client ${clientId} connected successfully. Total clients: ${Object.keys(clients).length}`);
});

const port = process.env.PORT || '8000';
const hostname = '0.0.0.0'; // Listen on all interfaces in container

httpServer.listen(port, hostname, () => { 
  console.log(`WebRTC Signaling Server listening on ${hostname}:${port}`); 
  console.log('Ready to accept WebSocket connections at paths like /ws/{client-id}');
});