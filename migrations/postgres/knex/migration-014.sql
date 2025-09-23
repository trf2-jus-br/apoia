-- Add event_number to ia_library_example (Postgres)

ALTER TABLE ia_library_example
  ADD COLUMN event_number VARCHAR(32) NULL;
