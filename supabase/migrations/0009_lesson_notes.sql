-- Migration 0009: Lesson Notes table, RLS, and RPC functions for live classroom notes

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

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Participants and founders can read lesson notes"
  ON public.lesson_notes FOR SELECT
  USING (
    auth.uid() = ANY(participants)
    OR public.is_founder()
  );

CREATE POLICY "Participants can update lesson notes"
  ON public.lesson_notes FOR UPDATE
  USING (
    auth.uid() = ANY(participants)
  )
  WITH CHECK (
    auth.uid() = ANY(participants)
  );

CREATE POLICY "Authenticated users can insert lesson notes if in participants"
  ON public.lesson_notes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = ANY(participants)
  );

-- RPC join_lesson_note: Creates note if missing, or adds auth.uid() to participants; returns note
CREATE OR REPLACE FUNCTION public.join_lesson_note(
  room_key TEXT,
  lesson_id TEXT
)
RETURNS SETOF public.lesson_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note public.lesson_notes;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.lesson_notes (room_key, lesson_id, content, version, participants, created_by, updated_by)
  VALUES (room_key, lesson_id, '', 0, ARRAY[v_uid], v_uid, v_uid)
  ON CONFLICT (room_key, lesson_id) DO UPDATE
    SET participants = CASE
      WHEN NOT (v_uid = ANY(lesson_notes.participants)) THEN array_append(lesson_notes.participants, v_uid)
      ELSE lesson_notes.participants
    END,
    updated_at = NOW()
  RETURNING * INTO v_note;

  RETURN NEXT v_note;
END;
$$;

-- RPC save_lesson_note: Updates note if base_version equals current version, else returns current row with conflict flag
CREATE OR REPLACE FUNCTION public.save_lesson_note(
  note_id UUID,
  content TEXT,
  base_version INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note public.lesson_notes;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_note
  FROM public.lesson_notes
  WHERE id = note_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Note not found';
  END IF;

  IF NOT (v_uid = ANY(v_note.participants) OR public.is_founder()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_note.version = base_version THEN
    UPDATE public.lesson_notes
    SET content = save_lesson_note.content,
        version = v_note.version + 1,
        updated_by = v_uid,
        updated_at = NOW()
    WHERE id = note_id
    RETURNING * INTO v_note;

    RETURN to_jsonb(v_note) || jsonb_build_object('conflict', false);
  ELSE
    RETURN to_jsonb(v_note) || jsonb_build_object('conflict', true);
  END IF;
END;
$$;
