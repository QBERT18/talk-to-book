# Vapi API & Call Button — Integration Guide

This document is a complete, self-contained reference for replicating the Vapi (`@vapi-ai/web`) voice-assistant integration and the call button UI from the `example-client-javascript-next` project into another Next.js project.

---

## Source Project Reference

- **Absolute path on disk:** `/Users/valeh/projects/example-client-javascript-next`
- **Framework:** Next.js (Pages Router) + TypeScript
- **Note for future Claude sessions:** If you need to inspect the original source files referenced in this guide (or check anything not captured here), read files directly from the path above.

---

## 1. Dependencies

The only Vapi-specific package is the official web SDK:

```bash
npm install @vapi-ai/web
```

The call button also uses `lucide-react` for icons:

```bash
npm install lucide-react
```

From `package.json`:

```json
"dependencies": {
  "@vapi-ai/web": "^1.0.266",
  "lucide-react": "^0.344.0"
}
```

A `Button` primitive from `components/ui/button` (shadcn/ui style) is used by the call button. If your target project doesn't have one, swap it for a plain `<button>`.

---

## 2. Environment Variables

Add these to `.env.local` in the target project:

```
NEXT_PUBLIC_VAPI_WEB_TOKEN=your-vapi-public-web-token
NEXT_PUBLIC_SERVER_URL=https://your-domain.com/api/webhook
```

- `NEXT_PUBLIC_VAPI_WEB_TOKEN` — your Vapi public web token. Get it from the Vapi dashboard. The `NEXT_PUBLIC_` prefix is intentional: the web SDK runs in the browser.
- `NEXT_PUBLIC_SERVER_URL` — public URL where Vapi will POST function-call webhooks (use ngrok or a deployed URL during development). Only required if you use server-side function handlers.

---

## 3. File-by-File Implementation

Create these files in the target project. The directory layout below mirrors the source project; adjust paths to your project's conventions.

### 3.1 `config/env.config.ts`

Centralizes environment variable access with sane fallbacks.

```ts
export const envConfig = {
  vapi: {
    apiUrl: process.env.NEXT_PUBLIC_VAPI_API_URL ?? "https://api.vapi.ai",
    token:
      process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN ??
      "51728923-fd15-4444-b456-3ac94a98a0fb",
  },
};
```

> Replace the hardcoded fallback token with your own, or remove the fallback entirely.

### 3.2 `lib/vapi.sdk.ts`

Singleton Vapi instance shared across the app. Importing this from multiple components is safe — the SDK is created once at module load.

```ts
import Vapi from "@vapi-ai/web";
import { envConfig } from "@/config/env.config";

export const vapi = new Vapi(envConfig.vapi.token);
```

### 3.3 `lib/types/conversation.type.ts`

TypeScript types for the messages emitted by Vapi over the `"message"` event.

```ts
export enum MessageTypeEnum {
  TRANSCRIPT = "transcript",
  FUNCTION_CALL = "function-call",
  FUNCTION_CALL_RESULT = "function-call-result",
  ADD_MESSAGE = "add-message",
}

export enum MessageRoleEnum {
  USER = "user",
  SYSTEM = "system",
  ASSISTANT = "assistant",
}

export enum TranscriptMessageTypeEnum {
  PARTIAL = "partial",
  FINAL = "final",
}

export interface TranscriptMessage extends BaseMessage {
  type: MessageTypeEnum.TRANSCRIPT;
  role: MessageRoleEnum;
  transcriptType: TranscriptMessageTypeEnum;
  transcript: string;
}

export interface FunctionCallMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL;
  functionCall: {
    name: string;
    parameters: any;
  };
}

export interface FunctionCallResultMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL_RESULT;
  functionCallResult: {
    forwardToClientEnabled?: boolean;
    result: any;
    [a: string]: any;
  };
}

export interface BaseMessage {
  type: MessageTypeEnum;
}

export type Message =
  | TranscriptMessage
  | FunctionCallMessage
  | FunctionCallResultMessage;
```

### 3.4 `assistants/assistant.ts`

The assistant configuration object passed to `vapi.start(...)`. **This is the file you customize most** for your own domain — change the system prompt, function definitions, voice, and first message.

The original Broadway example:

```ts
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

export const assistant: CreateAssistantDTO | any = {
  name: "Paula-broadway",
  model: {
    provider: "openai",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    systemPrompt: `You're Paula, an AI assistant who can help the user decide what do he/she wants to watch on Broadway. User can ask you to suggest shows and book tickets. You can get the list of available shows from broadway and show them to the user, and then you can help user decide which ones to choose and which broadway theatre they can visit. After this confirm the details and book the tickets. `,
    functions: [
      {
        name: "suggestShows",
        async: true,
        description: "Suggests a list of broadway shows to the user.",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description:
                "The location for which the user wants to see the shows.",
            },
            date: {
              type: "string",
              description:
                "The date for which the user wants to see the shows.",
            },
          },
        },
      },
      {
        name: "confirmDetails",
        async: true, // remove async to wait for BE response.
        description: "Confirms the details provided by the user.",
        parameters: {
          type: "object",
          properties: {
            show: {
              type: "string",
              description: "The show for which the user wants to book tickets.",
            },
            date: {
              type: "string",
              description:
                "The date for which the user wants to book the tickets.",
            },
            location: {
              type: "string",
              description:
                "The location for which the user wants to book the tickets.",
            },
            numberOfTickets: {
              type: "number",
              description: "The number of tickets that the user wants to book.",
            },
          },
        },
      },
      {
        name: "bookTickets",
        async: true, // remove async to wait for BE response.
        description: "Books tickets for the user.",
        parameters: {
          type: "object",
          properties: {
            show: {
              type: "string",
              description: "The show for which the user wants to book tickets.",
            },
            date: {
              type: "string",
              description:
                "The date for which the user wants to book the tickets.",
            },
            location: {
              type: "string",
              description:
                "The location for which the user wants to book the tickets.",
            },
            numberOfTickets: {
              type: "number",
              description: "The number of tickets that the user wants to book.",
            },
          },
        },
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: "paula",
  },
  firstMessage:
    "Hi. I'm Paula, Welcome to Broadway Shows! How are u feeling today?",
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL
    ? process.env.NEXT_PUBLIC_SERVER_URL
    : "https://08ae-202-43-120-244.ngrok-free.app/api/webhook",
};
```

**Key fields:**
- `model.provider` / `model.model` — LLM provider and model name
- `model.systemPrompt` — your assistant's persona and instructions
- `model.functions` — JSON-schema function definitions the LLM can call
- `functions[].async: true` — function returns immediately (fire-and-forget). Set to `false` if you need to wait for the webhook response and feed the result back into the conversation
- `voice.provider` / `voice.voiceId` — TTS voice (`11labs`, `playht`, `azure`, etc.)
- `firstMessage` — the assistant's opening line
- `serverUrl` — webhook endpoint Vapi POSTs to when functions are invoked

### 3.5 `hooks/useVapi.ts` — the central state hook

This hook owns all Vapi state and event listeners. Components use it to render UI and trigger calls.

```ts
"use client";

import { assistant } from "@/assistants/assistant";

import {
  Message,
  MessageTypeEnum,
  TranscriptMessage,
  TranscriptMessageTypeEnum,
} from "@/lib/types/conversation.type";
import { useEffect, useState } from "react";
import { vapi } from "@/lib/vapi.sdk";

export enum CALL_STATUS {
  INACTIVE = "inactive",
  ACTIVE = "active",
  LOADING = "loading",
}

export function useVapi() {
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(
    CALL_STATUS.INACTIVE
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const [activeTranscript, setActiveTranscript] =
    useState<TranscriptMessage | null>(null);

  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    const onSpeechStart = () => setIsSpeechActive(true);
    const onSpeechEnd = () => {
      console.log("Speech has ended");
      setIsSpeechActive(false);
    };

    const onCallStartHandler = () => {
      console.log("Call has started");
      setCallStatus(CALL_STATUS.ACTIVE);
    };

    const onCallEnd = () => {
      console.log("Call has stopped");
      setCallStatus(CALL_STATUS.INACTIVE);
    };

    const onVolumeLevel = (volume: number) => {
      setAudioLevel(volume);
    };

    const onMessageUpdate = (message: Message) => {
      console.log("message", message);
      if (
        message.type === MessageTypeEnum.TRANSCRIPT &&
        message.transcriptType === TranscriptMessageTypeEnum.PARTIAL
      ) {
        setActiveTranscript(message);
      } else {
        setMessages((prev) => [...prev, message]);
        setActiveTranscript(null);
      }
    };

    const onError = (e: any) => {
      setCallStatus(CALL_STATUS.INACTIVE);
      console.error(e);
    };

    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-start", onCallStartHandler);
    vapi.on("call-end", onCallEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("message", onMessageUpdate);
    vapi.on("error", onError);

    return () => {
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("call-start", onCallStartHandler);
      vapi.off("call-end", onCallEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("message", onMessageUpdate);
      vapi.off("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    setCallStatus(CALL_STATUS.LOADING);
    const response = vapi.start(assistant);

    response.then((res) => {
      console.log("call", res);
    });
  };

  const stop = () => {
    setCallStatus(CALL_STATUS.LOADING);
    vapi.stop();
  };

  const toggleCall = () => {
    if (callStatus == CALL_STATUS.ACTIVE) {
      stop();
    } else {
      start();
    }
  };

  return {
    isSpeechActive,
    callStatus,
    audioLevel,
    activeTranscript,
    messages,
    start,
    stop,
    toggleCall,
  };
}
```

**State exposed:**
| Field | Type | Purpose |
|---|---|---|
| `isSpeechActive` | `boolean` | True while user is speaking |
| `callStatus` | `CALL_STATUS` | `INACTIVE` / `LOADING` / `ACTIVE` |
| `audioLevel` | `number` (0–1) | Real-time mic volume; drives UI feedback |
| `activeTranscript` | `TranscriptMessage \| null` | Live partial transcript |
| `messages` | `Message[]` | History of finalized messages |
| `start` | `() => Promise<void>` | Begin a call |
| `stop` | `() => void` | End the call |
| `toggleCall` | `() => void` | Toggle start/stop |

**Vapi events used:**
- `speech-start` / `speech-end` — user speech boundaries
- `call-start` / `call-end` — call lifecycle
- `volume-level` — continuous mic volume (0–1)
- `message` — transcripts, function calls, function-call results
- `error` — any SDK error

> All listeners are unregistered in the `useEffect` cleanup. This matters: without `vapi.off(...)`, listeners stack up across remounts.

### 3.6 `components/app/assistantButton.tsx` — the call button

A circular button that swaps icon and color based on `callStatus`, with a glow effect driven by `audioLevel`.

```tsx
import { CALL_STATUS, useVapi } from "@/hooks/useVapi";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "../ui/button";

const AssistantButton = ({
  toggleCall,
  callStatus,
  audioLevel = 0,
}: Partial<ReturnType<typeof useVapi>>) => {
  const color =
    callStatus === CALL_STATUS.ACTIVE
      ? "red"
      : callStatus === CALL_STATUS.LOADING
      ? "orange"
      : "green";
  const buttonStyle = {
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    color: "white",
    border: "none",
    boxShadow: `1px 1px ${10 + audioLevel * 40}px ${
      audioLevel * 10
    }px ${color}`,
    backgroundColor:
      callStatus === CALL_STATUS.ACTIVE
        ? "red"
        : callStatus === CALL_STATUS.LOADING
        ? "orange"
        : "green",
    cursor: "pointer",
  };

  return (
    <Button
      style={buttonStyle}
      className={`transition ease-in-out ${
        callStatus === CALL_STATUS.ACTIVE
          ? "bg-red-500 hover:bg-red-700"
          : callStatus === CALL_STATUS.LOADING
          ? "bg-orange-500 hover:bg-orange-700"
          : "bg-green-500 hover:bg-green-700"
      } flex items-center justify-center`}
      onClick={toggleCall}
    >
      {callStatus === CALL_STATUS.ACTIVE ? (
        <Square />
      ) : callStatus === CALL_STATUS.LOADING ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Mic />
      )}
    </Button>
  );
};

export { AssistantButton };
```

**Visual states:**
| State | Color | Icon |
|---|---|---|
| `INACTIVE` | green | `Mic` |
| `LOADING` | orange | `Loader2` (spinning) |
| `ACTIVE` | red | `Square` (stop) |

The `boxShadow` size grows with `audioLevel`, producing a pulsing glow as the user/assistant speaks.

> If your project doesn't have a `Button` shadcn primitive, replace `<Button ...>` with `<button ...>`.

### 3.7 `components/app/assistant.tsx` — wrapper component

Glues the hook to the button (and to a `Display` component if you have one).

```tsx
"use client";

import { useVapi } from "../../hooks/useVapi";
import { AssistantButton } from "./assistantButton";
import { Display } from "./display";

function Assistant() {
  const { toggleCall, callStatus, audioLevel } = useVapi();
  return (
    <>
      <div className="chat-history">
        <Display />
      </div>
      <div className="user-input">
        <AssistantButton
          audioLevel={audioLevel}
          callStatus={callStatus}
          toggleCall={toggleCall}
        ></AssistantButton>
      </div>
    </>
  );
}

export { Assistant };
```

> If you don't need the `Display` component, just delete its import and usage.

### 3.8 `components/app/display.tsx` — reacting to function calls (optional pattern)

Demonstrates the **`vapi.on("message", ...)` + `vapi.send(...)`** pattern for handling assistant function calls on the client side. Use this as a template; the Broadway-specific show/ticket logic should be replaced with whatever your domain needs.

Key snippet:

```tsx
useEffect(() => {
  const onMessageUpdate = (message: Message) => {
    if (
      message.type === MessageTypeEnum.FUNCTION_CALL &&
      message.functionCall.name === "suggestShows"
    ) {
      // 1. React to the function call locally (e.g., update UI state)
      setStatus("show");

      // 2. Optionally send context back to the assistant so it knows
      //    what the user is now seeing
      vapi.send({
        type: MessageTypeEnum.ADD_MESSAGE,
        message: {
          role: "system",
          content: `Here is the list of suggested shows: ${JSON.stringify(
            shows.map((show) => show.title)
          )}`,
        },
      });
      setShowList(shows);
    }
  };

  vapi.on("message", onMessageUpdate);
  return () => {
    vapi.off("message", onMessageUpdate);
  };
}, []);
```

The reusable bits are:
- `vapi.on("message", handler)` to receive function-call messages on the client
- `vapi.send({ type: MessageTypeEnum.ADD_MESSAGE, message: { role, content } })` to inject system/user messages mid-conversation

### 3.9 `pages/api/webhook.ts` — server-side webhook handler

Vapi POSTs to this endpoint when the assistant invokes a function (only if `serverUrl` is set in the assistant config). Return `{ result: "..." }` and the assistant will speak/use the result.

```ts
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  try {
    if (req.method === "POST") {
      const { message } = req.body;

      const { type = "function-call", functionCall = {}, call } = message;
      console.log("payload message", message);

      if (type === "function-call") {
        if (functionCall?.name === "suggestShows") {
          const parameters = functionCall?.parameters;

          return res.status(201).json({
            result:
              "You can see the upcoming shows on the screen. Select which ones you want to choose.",
          });
        }

        return res.status(201).json({ data: functionCall?.parameters });
      }

      return res.status(201).json({});
    }

    return res.status(404).json({ message: "Not Found" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
```

> **App Router note:** If your target project uses the App Router instead of the Pages Router, move this to `app/api/webhook/route.ts` and use the `Request`/`Response` API:
>
> ```ts
> export async function POST(req: Request) {
>   const body = await req.json();
>   const { message } = body;
>   const { type, functionCall } = message ?? {};
>   if (type === "function-call" && functionCall?.name === "suggestShows") {
>     return Response.json({ result: "..." }, { status: 201 });
>   }
>   return Response.json({}, { status: 201 });
> }
> ```

### 3.10 `pages/index.tsx` — mounting the assistant

```tsx
import { Assistant } from "@/components/app/assistant";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-12">
      <div className="text-center">
        <h1 className="text-3xl">Welcome to Broadway Show Assistant</h1>
        <p className="text-slate-600">
          Talk with Paula to explore upcoming shows and book tickets.
        </p>
      </div>
      <Assistant />
    </main>
  );
}
```

---

## 4. Call Flow Walkthrough

```
User clicks button
    │
    ▼
toggleCall()  ──►  start()  ──►  vapi.start(assistant)
    │                                  │
    │                                  ▼
    │                          [Vapi backend connects]
    │                                  │
    │                                  ▼
    │                          "call-start" event
    │                                  │
    │                                  ▼
    │                  setCallStatus(ACTIVE)  ──►  button turns RED
    │
    ▼
User speaks ──► "speech-start" ──► "volume-level" stream ──► "speech-end"
                                          │
                                          ▼
                                 audioLevel updates ──► button glow pulses
    │
    ▼
"message" event (TRANSCRIPT, PARTIAL) ──► setActiveTranscript(...)
"message" event (TRANSCRIPT, FINAL)   ──► messages.push(...)
    │
    ▼
Assistant invokes a function
    │
    ▼
"message" event (FUNCTION_CALL) ──► Display reacts (vapi.send ADD_MESSAGE)
    │                                              │
    ▼                                              ▼
Vapi POSTs /api/webhook          (optional) update UI state locally
    │
    ▼
Server returns { result: "..." }  ──► assistant continues talking
    │
    ▼
User clicks button again
    │
    ▼
toggleCall() ──► stop() ──► vapi.stop() ──► "call-end" ──► setCallStatus(INACTIVE)
```

---

## 5. Replication Checklist

For a fresh Next.js project:

1. `npm install @vapi-ai/web lucide-react`
2. Add `NEXT_PUBLIC_VAPI_WEB_TOKEN` (and optionally `NEXT_PUBLIC_SERVER_URL`) to `.env.local`
3. Create `config/env.config.ts` (see §3.1)
4. Create `lib/vapi.sdk.ts` (see §3.2)
5. Create `lib/types/conversation.type.ts` (see §3.3)
6. Create `assistants/assistant.ts` — **customize systemPrompt, functions, voice, firstMessage** (see §3.4)
7. Create `hooks/useVapi.ts` (see §3.5) — copy verbatim
8. Create `components/app/assistantButton.tsx` (see §3.6) — copy verbatim or restyle
9. Create `components/app/assistant.tsx` (see §3.7) — drop the `Display` import if unused
10. (Optional) Create `pages/api/webhook.ts` if any function has `async: false` or you need server-side handling (see §3.9). Use the App Router variant if applicable.
11. Mount `<Assistant />` in a page (see §3.10)
12. Ensure HTTPS (required for browser mic access) — `localhost` works in dev

---

## 6. Customization Notes

- **The Broadway example is purely illustrative.** Replace the `systemPrompt`, `functions`, `firstMessage`, `voice.voiceId`, and any `Display` logic to fit your domain.
- **Function `async` flag:**
  - `async: true` — function returns immediately. Use for fire-and-forget UI updates handled on the client via `vapi.on("message", ...)`.
  - `async: false` — Vapi waits for the webhook response and feeds it back to the LLM. Use when the assistant must verbally confirm the result.
- **Voice provider** can be swapped (`11labs`, `playht`, `azure`, `deepgram`, etc.). The `voiceId` is provider-specific.
- **`vapi.send()`** is the primary way to inject context mid-call. Use it after a function call to tell the assistant what the user is now seeing on screen.
- **Listener cleanup is critical.** Always pair every `vapi.on(...)` with a matching `vapi.off(...)` in the `useEffect` cleanup, otherwise you'll leak handlers across remounts.
- **`Button` primitive:** the original uses a shadcn-style `Button` from `components/ui/button`. Plain `<button>` works fine — just keep the inline `style` and `onClick`.

---

## 7. Where to look in the source project

If anything in this guide is unclear, the original files live at:

| Section | Original file |
|---|---|
| Env config | `/Users/valeh/projects/example-client-javascript-next/config/env.config.ts` |
| SDK singleton | `/Users/valeh/projects/example-client-javascript-next/lib/vapi.sdk.ts` |
| Message types | `/Users/valeh/projects/example-client-javascript-next/lib/types/conversation.type.ts` |
| Assistant config | `/Users/valeh/projects/example-client-javascript-next/assistants/assistant.ts` |
| `useVapi` hook | `/Users/valeh/projects/example-client-javascript-next/hooks/useVapi.ts` |
| Call button | `/Users/valeh/projects/example-client-javascript-next/components/app/assistantButton.tsx` |
| Assistant wrapper | `/Users/valeh/projects/example-client-javascript-next/components/app/assistant.tsx` |
| Display / function-call handler | `/Users/valeh/projects/example-client-javascript-next/components/app/display.tsx` |
| Webhook | `/Users/valeh/projects/example-client-javascript-next/pages/api/webhook.ts` |
| Mounting page | `/Users/valeh/projects/example-client-javascript-next/pages/index.tsx` |
