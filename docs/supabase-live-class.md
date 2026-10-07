# Supabase Live Classroom Integration & Shared Lesson Notes

This document details the database architecture, Row-Level Security (RLS) policies, Remote Procedure Calls (RPC), and security boundaries for the live classroom shared notes system and peer session handshake.

---

## 1. Schema: `lesson_notes`

The `lesson_notes` table stores shared, collaborative notes for a live lesson session identified by `(room_key, lesson_id)`.

```sql
CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  content TEXT DEFAULT '',
  version INTEGER DEFAULT 0,
  participants UUID[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lesson_notes_room_lesson_key UNIQUE (room_key, lesson_id)
);
```

### Columns
- `id`: Primary key (`UUID`).
- `room_key`: The secret room key generated during host initialization (`32 hex characters`).
- `lesson_id`: Canonical path or identifier of the current lesson (e.g. `lessons/general-english-a1/daily-routine.json`).
- `content`: Plain text body of the shared note (defaults to `''`).
- `version`: Optimistic locking version counter (defaults to `0`).
- `participants`: Array of user UUIDs (`UUID[]`) who joined the note session.
- `created_by` / `updated_by`: Foreign keys to `auth.users(id)`.
- `updated_at`: Timestamp of last edit.

---

## 2. Row-Level Security (RLS) Policies

RLS is enabled on `public.lesson_notes`. Client operations respect the following rules:

1. **SELECT**: Allowed if `auth.uid() = ANY(participants)` or if the caller is a founder (`public.is_founder()`).
2. **UPDATE**: Allowed if `auth.uid() = ANY(participants)`. Direct client update must target rows where the user is a participant.
3. **INSERT**: Allowed for authenticated users (`auth.role() = 'authenticated'`) provided `auth.uid() = ANY(participants)`.
4. **DELETE**: Direct client deletes are disabled (no DELETE policy granted).

---

## 3. Remote Procedure Calls (RPC)

### 3.1 `join_lesson_note(room_key TEXT, lesson_id TEXT)`
- **Purpose**: Called when a participant opens or joins the Notes drawer.
- **Behavior**:
  - Checks that `auth.uid()` is authenticated.
  - Inserts a new `lesson_notes` row if missing for `(room_key, lesson_id)` with `participants = ARRAY[auth.uid()]`.
  - If the row exists, appends `auth.uid()` to `participants` (if not already present).
  - Returns the `lesson_notes` record (`SETOF public.lesson_notes`).

### 3.2 `save_lesson_note(note_id UUID, content TEXT, base_version INTEGER)`
- **Purpose**: Persists note content to Supabase using optimistic concurrency control.
- **Behavior**:
  - Checks `auth.uid()`.
  - Verifies the user is in `participants` (or `public.is_founder()`).
  - Compares `base_version` with the current stored `version`:
    - **Match (`version = base_version`)**: Updates `content`, increments `version` by 1 (`version = version + 1`), updates `updated_by` and `updated_at`, and returns the record with `{"conflict": false}`.
    - **Mismatch (`version != base_version`)**: Returns the current stored record with `{"conflict": true}` without modifying data.

---

## 4. Room Key Handshake Verification & Client Security Limits

### 4.1 Client Handshake Protocol
1. When a teacher starts a room in `classroom.html`, a random 12-char room ID and a 32-hex-character `room_key` are generated (`crypto.getRandomValues`).
2. Connected peers include `metadata: { k: room_key }` in their PeerJS connection request.
3. The host verifies `conn.metadata.k === room_key`. If invalid or missing, the host immediately closes the data connection (`c.close()`).
4. `join_lesson_note` is executed on the client **only** after the participant passes this room key handshake.

### 4.2 Security Limits & Design Considerations
- **Client-Enforced Handshake**: The room key handshake is evaluated client-side on the WebRTC host instance. A malicious client bypass or modified PeerJS client could bypass host-side WebRTC packet filtering.
- **Supabase Authorization Boundary**: Access to `lesson_notes` at the database level is protected by RLS and RPC caller checks (`auth.uid() = ANY(participants)`). A signed-in user who acquires the `room_key` and `lesson_id` can invoke `join_lesson_note` to add themselves as a participant.
- **Data Isolation**: Peer-to-peer live state synchronization (drawing, slide navigation, chat) uses the PeerJS data channel and does not use Supabase Realtime. Supabase database interactions are restricted to RPC calls (`join_lesson_note`, `save_lesson_note`) for persistence.

---

## 5. PeerJS WebRTC ICE Server Configuration

PeerJS WebRTC call initialization in `classroom.html` uses STUN/TURN server configurations specified in `shared/js/config.js` (`window.COSY_CONFIG.ICE_SERVERS`):

```javascript
window.COSY_CONFIG = {
  SUPABASE_URL: "...",
  SUPABASE_ANON_KEY: "...",
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
    // TURN server placeholder:
    // { urls: "turn:turn.example.com:3478", username: "user", credential: "password" }
  ]
};
```

When PeerJS video calling starts (`startPeerJsVideoCall`), `window.COSY_CONFIG.ICE_SERVERS` is passed directly into the PeerJS Peer options (`{ config: { iceServers: ... } }`) to ensure consistent NAT traversal across client environments.
