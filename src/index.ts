import { Container, getContainer } from "@cloudflare/containers";
import { Hono } from "hono";

export class MyContainer extends Container {
  // Port the container listens on (matches your server.js)
  defaultPort = 8000;
  // Keep containers alive longer for WebSocket connections
  sleepAfter = "30s";
  
  // Optional lifecycle hooks
  onStart() {
    console.log("Signaling server container successfully started");
  }

  onStop() {
    console.log("Signaling server container successfully shut down");
  }

  onError(error: unknown) {
    console.log("Signaling server container error:", error);
  }
}

// Create Hono app with proper typing for Cloudflare Workers
const app = new Hono<{
  Bindings: {
    MY_CONTAINER: DurableObjectNamespace<MyContainer>;
  };
}>();

// Home route with information about the signaling server
app.get("/", async (c) => {
  // Check if this is a WebSocket upgrade request
  if (c.req.header("upgrade") === "websocket") {
    // This is a WebSocket request, forward to container
    const container = getContainer(c.env.MY_CONTAINER, "signaling-server");
    return await container.fetch(c.req.raw);
  }
  
  // Regular HTTP request - show info page
  return c.text(
    "WebRTC Signaling Server\n" +
      "WebSocket endpoint: ws://your-worker-domain.workers.dev/{client-id}\n" +
      "Or: ws://your-worker-domain.workers.dev/ws/{client-id}\n" +
      "Replace {client-id} with a unique identifier for each client\n" +
      "\nThis server facilitates WebRTC peer-to-peer connections by relaying signaling messages between clients."
  );
});

// Handle all requests - let the container determine how to handle them
// This includes WebSocket upgrade requests and regular HTTP requests
app.all("*", async (c) => {
  const container = getContainer(c.env.MY_CONTAINER, "signaling-server");
  return await container.fetch(c.req.raw);
});

export default app;
