ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS label text;

DELETE FROM public.match_predictions WHERE match_id IN (SELECT id FROM public.matches WHERE base_tournament_id='867aa20b-2ea8-4e97-90aa-8d1a1d3e9c17');
DELETE FROM public.match_results WHERE match_id IN (SELECT id FROM public.matches WHERE base_tournament_id='867aa20b-2ea8-4e97-90aa-8d1a1d3e9c17');
DELETE FROM public.matches WHERE base_tournament_id='867aa20b-2ea8-4e97-90aa-8d1a1d3e9c17';
DELETE FROM public.teams WHERE base_tournament_id='867aa20b-2ea8-4e97-90aa-8d1a1d3e9c17';