# NestJS Microservices Chat App

A step-by-step learning project demonstrating NestJS microservices architecture using TCP transport.

---

## Project Structure

```
apps/
├── microservices-chat-app/   ← API Gateway (HTTP :3000) — exposed to outside world
├── auth-service/             ← Auth Microservice (TCP :3001) — internal only
└── chat-service/             ← Chat Microservice (TCP :3002) — internal only
```

---

## The Big Picture

```
Client (Postman / Browser)
        |
        | HTTP Request
        ▼
┌──────────────────────────┐
│  microservices-chat-app  │  ← API Gateway (Port 3000)
│       (main app)         │     Only this is exposed to the outside
└────────────┬─────────────┘
             |  TCP Messages (internal network)
   ┌─────────┴──────────┐
   ▼                    ▼
┌────────────┐   ┌──────────────┐
│auth-service│   │ chat-service │
│ (Port 3001)│   │  (Port 3002) │
└────────────┘   └──────────────┘
```

The outside world **only talks to port 3000**.
The main app then **forwards** each request internally to auth or chat service over TCP.
No HTTP is used between services — only raw TCP messages.

---

## Step 1 — What is `Transport.TCP`?

NestJS microservices communicate through a **transport layer**. TCP is the simplest one.

```
Auth Service  → binds TCP port 3001
Chat Service  → binds TCP port 3002
Main App      → connects to both as a TCP client
```

When the main app wants to call auth-service, it opens a TCP socket to `localhost:3001`
and sends a JSON message. Auth-service receives it, processes it, and sends back a
response over the same socket.

---

## Step 2 — How `auth-service` and `chat-service` Boot (`main.ts`)

```ts
// apps/auth-service/src/main.ts

const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AuthServiceModule,
  {
    transport: Transport.TCP,
    options: { host: 'localhost', port: 3001 },
  },
);
await app.listen(); // binds TCP socket and waits for messages
```

Key difference from a normal NestJS app:

| Normal NestJS App              | Microservice                       |
| ------------------------------ | ---------------------------------- |
| `NestFactory.create()`         | `NestFactory.createMicroservice()` |
| `app.listen(3000)` HTTP server | `app.listen()` binds a TCP socket  |
| Receives HTTP requests         | Receives TCP messages              |

---

## Step 3 — How Services Declare What They Handle (`@MessagePattern`)

```ts
// apps/auth-service/src/auth-service.controller.ts

@MessagePattern({ cmd: 'login' })        // "I handle messages where cmd = login"
login(@Payload() data: { email: string; password: string }) {
  return this.authServiceService.login(data);
}

@MessagePattern({ cmd: 'register' })
register(@Payload() data: { email: string; password: string; name: string }) {
  return this.authServiceService.register(data);
}
```

`@MessagePattern` is like `@Get()` / `@Post()` — but for TCP messages instead of HTTP routes.

| HTTP Controller   | Microservice Controller             |
| ----------------- | ----------------------------------- |
| `@Get('/login')`  | `@MessagePattern({ cmd: 'login' })` |
| `@Body()`         | `@Payload()`                        |
| Returns HTTP body | Returns TCP response                |

---

## Step 4 — How the Main App Registers Service Clients (`ClientsModule`)

```ts
// apps/microservices-chat-app/src/app.module.ts

ClientsModule.register([
  {
    name: 'AUTH_SERVICE', // token name used for injection
    transport: Transport.TCP,
    options: { host: 'localhost', port: 3001 },
  },
  {
    name: 'CHAT_SERVICE',
    transport: Transport.TCP,
    options: { host: 'localhost', port: 3002 },
  },
]);
```

This tells NestJS:

- Create a TCP client called `AUTH_SERVICE` that connects to port 3001
- Create a TCP client called `CHAT_SERVICE` that connects to port 3002

These clients are now available for injection anywhere in the main app.

---

## Step 5 — How the Main App Sends Messages (`ClientProxy`)

```ts
// apps/microservices-chat-app/src/app.service.ts

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    // matches the name in ClientsModule.register()
    @Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
  ) {}

  login(data: { email: string; password: string }) {
    return this.authClient.send({ cmd: 'login' }, data);
    //                     ↑ pattern   ↑ payload
  }
}
```

`ClientProxy.send(pattern, data)`:

- **`pattern`** — must match the `@MessagePattern` on the receiving service
- **`data`** — the payload sent over TCP
- Returns an **Observable** (RxJS) — NestJS automatically subscribes and sends the result as HTTP response

---

## Step 6 — How the HTTP Layer Works (`AppController`)

```ts
// apps/microservices-chat-app/src/app.controller.ts

@Post('auth/login')
login(@Body() body: { email: string; password: string }) {
  return this.appService.login(body); // calls ClientProxy.send() internally
}
```

This is a normal HTTP controller. It receives an HTTP POST, passes the body to the
service, which forwards it over TCP to auth-service.

---

## Full Request Lifecycle — Login Example

```
1. Client sends:
   POST http://localhost:3000/auth/login
   { "email": "user@test.com", "password": "secret" }

2. AppController.login() receives the HTTP request
   → calls AppService.login({ email, password })

3. AppService.login() calls:
   authClient.send({ cmd: 'login' }, { email, password })
   → opens TCP connection to localhost:3001
   → sends JSON: { "pattern": { "cmd": "login" }, "data": { "email": "...", "password": "..." } }

4. AuthServiceController receives the TCP message
   → pattern { cmd: 'login' } matches @MessagePattern({ cmd: 'login' })
   → calls AuthServiceService.login({ email, password })

5. AuthServiceService.login() returns:
   { success: true, token: 'mock-token', user: { email: '...' } }

6. That return value travels back over TCP to the main app

7. Main app receives the response and returns it as HTTP:
   HTTP 200 { "success": true, "token": "mock-token", "user": { "email": "..." } }
```

---

## Port Map

| Service                  | Port | Protocol | Handles                                                                            |
| ------------------------ | ---- | -------- | ---------------------------------------------------------------------------------- |
| `microservices-chat-app` | 3000 | HTTP     | `POST /auth/login`, `POST /auth/register`, `POST /chat/send`, `GET /chat/messages` |
| `auth-service`           | 3001 | TCP      | `{ cmd: 'login' }`, `{ cmd: 'register' }`                                          |
| `chat-service`           | 3002 | TCP      | `{ cmd: 'send_message' }`, `{ cmd: 'get_messages' }`                               |

---

## Running the App

### Option A — Local (without Docker)

Install dependencies:

```bash
yarn install
```

Start all three services in **separate terminals**:

```bash
# Terminal 1 — API Gateway (HTTP)
yarn start:dev

# Terminal 2 — Auth Service (TCP)
yarn start:dev auth-service

# Terminal 3 — Chat Service (TCP)
yarn start:dev chat-service
```

---

### Option B — Docker

#### Start all services (first time or after changes)

```bash
docker-compose up --build
```

#### Start in background (detached mode)

```bash
docker-compose up --build -d
```

#### After editing source code — rebuild required

The Dockerfile compiles TypeScript at build time. A plain restart won't pick up code changes — you must **rebuild**.

```bash
# Rebuild and restart a single service
docker-compose up --build gateway

# Rebuild and restart all services
docker-compose up --build

# Rebuild with no cache (force fresh npm install)
docker-compose build --no-cache && docker-compose up
```

#### Restart containers (no rebuild — for env/config changes only)

```bash
docker-compose restart gateway       # single service
docker-compose restart               # all services
```

> **Rule of thumb:** edited `.ts` files → use `--build`. Changed only `.env` → `restart` is enough.

#### Stop containers

```bash
docker-compose down          # stop, keep volumes (databases intact)
docker-compose down -v       # stop and delete volumes (resets all databases)
```

#### View logs

```bash
docker-compose logs -f              # all services
docker-compose logs -f gateway      # gateway only
docker-compose logs -f auth-service
docker-compose logs -f chat-service
```

#### Docker port map

| Container    | Host port | Container port | Protocol |
| ------------ | --------- | -------------- | -------- |
| gateway      | 3000      | 3000           | HTTP     |
| auth-service | 3001      | 3001           | TCP      |
| chat-service | 3002      | 3002           | TCP      |
| auth-db      | 27017     | 27017          | MongoDB  |
| chat-db      | 27018     | 27017          | MongoDB  |

#### Health check

```bash
curl http://localhost:3000/health
# { "status": "ok", "timestamp": "...", "services": ["auth-service", "chat-service"] }
```

---

## Testing with curl

### Register a user

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123","name":"Hassan"}'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123"}'
```

### Send a chat message

```bash
curl -X POST http://localhost:3000/chat/send \
  -H "Content-Type: application/json" \
  -d '{"from":"user1","to":"user2","message":"Hello!"}'
```

### Get messages

```bash
curl http://localhost:3000/chat/messages?userId=user1
```

---

## Key Concepts Summary

| Concept                            | Where Used            | What It Does                                                |
| ---------------------------------- | --------------------- | ----------------------------------------------------------- |
| `NestFactory.createMicroservice()` | auth/chat `main.ts`   | Starts a TCP server instead of HTTP                         |
| `@MessagePattern()`                | auth/chat controllers | Declares which messages this method handles                 |
| `@Payload()`                       | auth/chat controllers | Extracts data from TCP message (like `@Body()` for HTTP)    |
| `ClientsModule.register()`         | main app module       | Registers TCP clients to connect to services                |
| `@Inject('NAME')`                  | main app service      | Injects the TCP client by its registered name               |
| `ClientProxy.send()`               | main app service      | Sends a message and waits for response (returns Observable) |

---

## File Reference

```
apps/
├── microservices-chat-app/src/
│   ├── main.ts               → Starts HTTP server on port 3000
│   ├── app.module.ts         → Registers ClientsModule with AUTH_SERVICE + CHAT_SERVICE
│   ├── app.controller.ts     → HTTP endpoints — proxies to services
│   └── app.service.ts        → Uses ClientProxy to send TCP messages
│
├── auth-service/src/
│   ├── main.ts               → Starts TCP microservice on port 3001
│   ├── auth-service.module.ts
│   ├── auth-service.controller.ts  → @MessagePattern for login + register
│   └── auth-service.service.ts     → Business logic for auth
│
└── chat-service/src/
    ├── main.ts               → Starts TCP microservice on port 3002
    ├── chat-service.module.ts
    ├── chat-service.controller.ts  → @MessagePattern for send_message + get_messages
    └── chat-service.service.ts     → Business logic for chat
```
