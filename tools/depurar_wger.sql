-- Depuración periódica de la BDD wger de Pegasus Fit
-- Uso (en el NAS): sudo docker exec -i wger-db-1 psql -U wger -d wger < depurar_wger.sql
-- SIEMPRE con backup previo: sudo docker exec wger-db-1 pg_dump -U wger wger | gzip > backup.sql.gz

-- 1) Diagnóstico: entradas de rutina que apuntan a ejercicios inexistentes
--    (puede pasar si se reimporta el catálogo con rutinas ya creadas)
SELECT se.id AS slotentry_huerfana, s.day_id, d.routine_id
FROM manager_slotentry se
LEFT JOIN exercises_exercise e ON e.id = se.exercise_id
JOIN manager_slot s ON s.id = se.slot_id
JOIN manager_day d ON d.id = s.day_id
WHERE e.id IS NULL;

-- 2) Diagnóstico: rutinas sin ningún día (cascarones vacíos)
SELECT r.id, r.name, r.user_id, r.created
FROM manager_routine r
LEFT JOIN manager_day d ON d.routine_id = r.id
GROUP BY r.id HAVING count(d.id) = 0;

-- 3) Diagnóstico: rutinas de usuarios eliminados (no debería haber por FK, verificación)
SELECT r.id, r.name FROM manager_routine r
LEFT JOIN auth_user u ON u.id = r.user_id
WHERE u.id IS NULL;

-- 4) Limpieza (descomentar tras revisar los diagnósticos):
-- DELETE FROM manager_slotentry se USING manager_slotentry x
--   LEFT JOIN exercises_exercise e ON e.id = x.exercise_id
--   WHERE se.id = x.id AND e.id IS NULL;
-- DELETE FROM manager_routine r WHERE NOT EXISTS
--   (SELECT 1 FROM manager_day d WHERE d.routine_id = r.id);

-- Estado 2026-07-15 tras el redespliegue: 0 rutinas, 0 días, 0 logs — BDD limpia.
