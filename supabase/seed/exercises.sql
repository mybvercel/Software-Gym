-- ============================================================
-- GymOS — Seed: 60 ejercicios base globales (gym_id = NULL)
-- Ejecutar DESPUÉS de 001_initial_schema.sql
-- ============================================================

INSERT INTO exercises (name, muscle_group, equipment, difficulty, video_url, instructions) VALUES

-- ── PECHO ──────────────────────────────────────────────────
('Press de banca plano', 'chest', 'barbell', 'intermediate',
 'https://www.youtube.com/watch?v=rT7DgCr-3pg',
 ARRAY['Acostarse en el banco con los pies apoyados en el suelo','Agarre ligeramente más ancho que los hombros','Bajar la barra hasta tocar el pecho con control','Empujar explosivamente hasta extender los codos']),

('Press de banca inclinado', 'chest', 'barbell', 'intermediate',
 'https://www.youtube.com/watch?v=DbFgADa2PL8',
 ARRAY['Banco a 30-45°','Bajar la barra hacia la parte superior del pecho','Mantener los codos a 75° del cuerpo']),

('Press de banca con mancuernas', 'chest', 'dumbbell', 'beginner',
 'https://www.youtube.com/watch?v=VmB1G1K7v94',
 ARRAY['Mayor rango de movimiento que con barra','Al bajar, los codos a la altura del banco','Juntar las mancuernas en la parte superior']),

('Aperturas con mancuernas', 'chest', 'dumbbell', 'beginner',
 NULL,
 ARRAY['Brazos ligeramente flexionados durante todo el movimiento','Abrir hasta sentir estiramiento en el pecho','Cerrar imaginando que abrazás un árbol']),

('Fondos en paralelas', 'chest', 'bodyweight', 'intermediate',
 'https://www.youtube.com/watch?v=2z8JmcrW-As',
 ARRAY['Inclinarse hacia adelante para enfatizar el pecho','Bajar hasta que los hombros estén a la altura de los codos','Empujar controladamente']),

('Crossover en cable', 'chest', 'cable', 'intermediate',
 NULL,
 ARRAY['Poleas en posición alta','Tirar hacia abajo y al centro','Mantener ligera flexión en los codos']),

-- ── ESPALDA ─────────────────────────────────────────────────
('Dominadas (pull-up)', 'back', 'bodyweight', 'intermediate',
 'https://www.youtube.com/watch?v=eGo4IYlbE5g',
 ARRAY['Agarre supino más ancho que los hombros','Activar escapulas antes de tirar','Llevar el pecho hacia la barra']),

('Remo con barra', 'back', 'barbell', 'intermediate',
 'https://www.youtube.com/watch?v=9efgcAjQe7E',
 ARRAY['Torso inclinado 45°','Tirar hacia el ombligo','Apretar la espalda en la contracción']),

('Remo con mancuerna', 'back', 'dumbbell', 'beginner',
 NULL,
 ARRAY['Apoyar rodilla y mano en el banco','Tirar el codo hacia el techo','No rotar el torso']),

('Jalón al pecho (polea alta)', 'back', 'cable', 'beginner',
 'https://www.youtube.com/watch?v=CAwf7n6Luuc',
 ARRAY['Agarre pronado, más ancho que hombros','Tirar hacia el pecho, no detrás del cuello','Abrir el pecho en la bajada']),

('Peso muerto convencional', 'back', 'barbell', 'advanced',
 'https://www.youtube.com/watch?v=op9kVnSso6Q',
 ARRAY['Pies al ancho de cadera','Barra pegada a las piernas en todo momento','Caderas y hombros suben a la misma velocidad','Mirar al frente, espalda neutra']),

('Peso muerto rumano', 'back', 'barbell', 'intermediate',
 NULL,
 ARRAY['Rodillas ligeramente flexionadas','Bajar la barra deslizando por las piernas','Empujar caderas hacia atrás']),

-- ── HOMBROS ─────────────────────────────────────────────────
('Press militar con barra', 'shoulders', 'barbell', 'intermediate',
 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
 ARRAY['De pie o sentado','Barra desde la altura de la barbilla','Empujar en línea recta hacia arriba']),

('Press con mancuernas sentado', 'shoulders', 'dumbbell', 'beginner',
 NULL,
 ARRAY['Sentarse en banco con respaldo','Mancuernas a la altura de las orejas','Extender hacia arriba sin bloquear']),

('Elevaciones laterales', 'shoulders', 'dumbbell', 'beginner',
 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
 ARRAY['Ligera flexión en los codos','Elevar hasta la altura de los hombros','No usar el impulso del cuerpo']),

('Elevaciones frontales', 'shoulders', 'dumbbell', 'beginner',
 NULL,
 ARRAY['Un brazo o ambos a la vez','Elevar hasta la altura de los ojos','Movimiento controlado en la bajada']),

('Pájaro (posterior de hombros)', 'shoulders', 'dumbbell', 'beginner',
 NULL,
 ARRAY['Inclinado hacia adelante','Codos ligeramente flexionados','Elevar abriendo brazos como alas']),

-- ── BRAZOS ──────────────────────────────────────────────────
('Curl de bíceps con barra', 'arms', 'barbell', 'beginner',
 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
 ARRAY['Codos pegados al cuerpo','No balancear el torso','Contraer el bíceps en la parte superior']),

('Curl martillo', 'arms', 'dumbbell', 'beginner',
 NULL,
 ARRAY['Agarre neutro (pulgares hacia arriba)','Trabaja el braquiorradial','Codos fijos']),

('Curl en banco Scott', 'arms', 'barbell', 'intermediate',
 NULL,
 ARRAY['Codos apoyados en el banco Scott','Elimina el impulso completamente','Bajar con control']),

('Extensión de tríceps en polea', 'arms', 'cable', 'beginner',
 NULL,
 ARRAY['Codos pegados al cuerpo','Extender completamente','Pausar 1 segundo en la contracción']),

('Press francés con barra Z', 'arms', 'barbell', 'intermediate',
 NULL,
 ARRAY['Acostado, barra sobre la frente','Codos apuntan al techo','No mover los codos']),

('Fondos en banco para tríceps', 'arms', 'bodyweight', 'beginner',
 NULL,
 ARRAY['Manos en el borde del banco','Cuerpo pegado al banco','Bajar hasta 90° de codos']),

-- ── PIERNAS ─────────────────────────────────────────────────
('Sentadilla con barra', 'legs', 'barbell', 'intermediate',
 'https://www.youtube.com/watch?v=ultWZbUMPL8',
 ARRAY['Barra en la parte alta de los trapecios','Pies al ancho de hombros o más','Bajar hasta paralelo o más profundo','Rodillas siguiendo la dirección de los pies']),

('Sentadilla goblet', 'legs', 'kettlebell', 'beginner',
 NULL,
 ARRAY['Mancuerna o kettlebell frente al pecho','Talones en el suelo','Bajar profundo manteniendo el torso erguido']),

('Prensa de piernas', 'legs', 'machine', 'beginner',
 NULL,
 ARRAY['Pies al ancho de hombros en la plataforma','No bloquear rodillas en la extensión','Rodillas no deben sobrepasar los pies en exceso']),

('Extensión de cuádriceps', 'legs', 'machine', 'beginner',
 NULL,
 ARRAY['Ajustar el apoya-piernas a los tobillos','Extender completamente y contraer','Bajar con control']),

('Curl femoral acostado', 'legs', 'machine', 'beginner',
 NULL,
 ARRAY['Tobillos bajo el rodillo','Llevar talones hacia los glúteos','Pausar en la contracción']),

('Zancadas (lunges)', 'legs', 'dumbbell', 'beginner',
 'https://www.youtube.com/watch?v=QOVaHwm-Q6U',
 ARRAY['Paso largo hacia adelante','Rodilla trasera baja sin tocar el suelo','Rodilla delantera no sobrepasar el pie']),

('Sentadilla búlgara', 'legs', 'dumbbell', 'advanced',
 'https://www.youtube.com/watch?v=2C-uNgKwPLE',
 ARRAY['Pie trasero elevado en un banco','Bajar verticalmente','Mantener el torso erguido']),

('Step-up en caja', 'legs', 'dumbbell', 'beginner',
 NULL,
 ARRAY['Subir con todo el pie en la caja','Empujar desde el talón','Bajar con control']),

-- ── GLÚTEOS ─────────────────────────────────────────────────
('Hip thrust con barra', 'glutes', 'barbell', 'intermediate',
 'https://www.youtube.com/watch?v=LM8XHLYJoYs',
 ARRAY['Hombros apoyados en banco','Barra sobre las caderas con almohadilla','Empujar caderas hacia el techo','Apretar glúteos en la parte superior']),

('Patada de glúteo en polea', 'glutes', 'cable', 'beginner',
 NULL,
 ARRAY['Tobillo en el agarre de la polea baja','Extender la pierna hacia atrás','No arquear la espalda']),

('Abducción de cadera en máquina', 'glutes', 'machine', 'beginner',
 NULL,
 ARRAY['Sentarse con rodillas juntas','Abrir contra la resistencia','Volver lentamente']),

('Peso muerto con piernas rígidas', 'glutes', 'barbell', 'intermediate',
 NULL,
 ARRAY['Rodillas casi extendidas','Bajar la barra por las piernas','Sentir el estiramiento en isquiotibiales']),

-- ── CORE ────────────────────────────────────────────────────
('Plancha frontal', 'core', 'bodyweight', 'beginner',
 NULL,
 ARRAY['Cuerpo en línea recta de cabeza a talones','Activar abdomen y glúteos','Respirar con normalidad']),

('Crunch abdominal', 'core', 'bodyweight', 'beginner',
 NULL,
 ARRAY['No jalar del cuello','Subir solo hasta que la espalda baja se separe del suelo','Bajar con control']),

('Elevación de piernas colgado', 'core', 'bodyweight', 'intermediate',
 NULL,
 ARRAY['Colgado de la barra','Levantar piernas hasta la horizontal o más','Bajar sin balancear']),

('Rueda abdominal (ab wheel)', 'core', 'other', 'advanced',
 NULL,
 ARRAY['Rodillas en el suelo al empezar','Extender lentamente','Contraer el core para volver']),

('Plancha lateral', 'core', 'bodyweight', 'beginner',
 NULL,
 ARRAY['Apoyo en un codo y el borde del pie','Cadera elevada y alineada','Mantener posición estática']),

('Russian twist', 'core', 'other', 'beginner',
 NULL,
 ARRAY['Sentado con rodillas flexionadas','Rotar el tronco de lado a lado','Con o sin peso']),

('Dead bug', 'core', 'bodyweight', 'beginner',
 NULL,
 ARRAY['Acostado, brazos y piernas al aire','Bajar brazo y pierna opuestos manteniendo la espalda baja en el suelo','Alternar lados']),

-- ── CARDIO ──────────────────────────────────────────────────
('Caminata en cinta', 'cardio', 'machine', 'beginner',
 NULL,
 ARRAY['Inclinación recomendada 1-2%','Velocidad 5-7 km/h','Postura erguida, no apoyarse en las barras']),

('Carrera en cinta', 'cardio', 'machine', 'intermediate',
 NULL,
 ARRAY['Calentamiento de 5 min caminando','Cadencia de zancada alta','Aterrizar con el mediopié']),

('Bicicleta estática', 'cardio', 'machine', 'beginner',
 NULL,
 ARRAY['Asiento a la altura de la cadera','Resistencia moderada','Cadencia 70-90 RPM']),

('Elíptica', 'cardio', 'machine', 'beginner',
 NULL,
 ARRAY['Movimiento fluido sin impacto','Usar los brazos activamente','Alternar velocidad e inclinación']),

('Remo ergómetro', 'cardio', 'machine', 'intermediate',
 NULL,
 ARRAY['Empujar con las piernas primero','Luego inclinar el torso','Finalmente tirar de los brazos']),

('Salto a la cuerda', 'cardio', 'other', 'beginner',
 NULL,
 ARRAY['Saltar con ambos pies','Rotación solo con las muñecas','Mantener los codos cerca del cuerpo']),

-- ── FULL BODY ────────────────────────────────────────────────
('Burpees', 'full_body', 'bodyweight', 'intermediate',
 NULL,
 ARRAY['Posición de plancha','Flexión (opcional)','Saltar explosivamente con los brazos arriba']),

('Thruster con mancuernas', 'full_body', 'dumbbell', 'intermediate',
 NULL,
 ARRAY['Sentadilla completa','Empujar los brazos al levantarse','Movimiento continuo']),

('Kettlebell swing', 'full_body', 'kettlebell', 'intermediate',
 'https://www.youtube.com/watch?v=YSxHifyI6s8',
 ARRAY['Empujar caderas hacia atrás','No agachar, es un movimiento de bisagra de cadera','El impulso viene de las caderas, no de los brazos']),

('Clean con mancuernas', 'full_body', 'dumbbell', 'advanced',
 NULL,
 ARRAY['Tirar explosivamente desde el piso','Girar las muñecas para "recibir" las mancuernas','Amortiguar bajando levemente las rodillas']),

('Man makers', 'full_body', 'dumbbell', 'advanced',
 NULL,
 ARRAY['Plancha con mancuernas','Remo a cada lado','Press de suelo','Ponerse de pie con curl + press']),

('Sentadilla con salto', 'full_body', 'bodyweight', 'intermediate',
 NULL,
 ARRAY['Sentadilla completa','Salto explosivo','Aterrizar suavemente con rodillas semi-flexionadas']),

('Box jump', 'full_body', 'other', 'intermediate',
 NULL,
 ARRAY['Salto explosivo con brazos','Aterrizar en el centro de la caja','Bajar caminando, no saltando']),

('Mountain climbers', 'full_body', 'bodyweight', 'beginner',
 NULL,
 ARRAY['Posición de plancha alta','Llevar rodillas alternadamente al pecho','Caderas niveladas']),

('Turkish get-up', 'full_body', 'kettlebell', 'advanced',
 NULL,
 ARRAY['Brazo extendido en todo momento','Movimiento lento y controlado','7 pasos para ponerse de pie'])

ON CONFLICT DO NOTHING;
