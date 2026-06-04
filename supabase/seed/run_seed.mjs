import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xquvzgwxpqfxtnyzdixb.supabase.co',
  'REMOVED_FROM_HISTORY'
)

const exercises = [
  { name: "Press de banca plano", muscle_group: "chest", equipment: "barbell", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=rT7DgCr-3pg", instructions: ["Acostarse en el banco con los pies apoyados en el suelo", "Agarre ligeramente mas ancho que los hombros", "Bajar la barra hasta tocar el pecho con control", "Empujar explosivamente hasta extender los codos"] },
  { name: "Press de banca inclinado", muscle_group: "chest", equipment: "barbell", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=DbFgADa2PL8", instructions: ["Banco a 30-45 grados", "Bajar la barra hacia la parte superior del pecho", "Mantener los codos a 75 grados del cuerpo"] },
  { name: "Press con mancuernas plano", muscle_group: "chest", equipment: "dumbbell", difficulty: "beginner", video_url: null, instructions: ["Mayor rango de movimiento que con barra", "Al bajar los codos a la altura del banco", "Juntar las mancuernas en la parte superior"] },
  { name: "Aperturas con mancuernas", muscle_group: "chest", equipment: "dumbbell", difficulty: "beginner", video_url: null, instructions: ["Brazos ligeramente flexionados", "Abrir hasta sentir estiramiento en el pecho", "Cerrar como si abrazaras un arbol"] },
  { name: "Fondos en paralelas", muscle_group: "chest", equipment: "bodyweight", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=2z8JmcrW-As", instructions: ["Inclinarse hacia adelante", "Bajar hasta que los hombros esten a la altura de los codos", "Empujar controladamente"] },
  { name: "Crossover en cable", muscle_group: "chest", equipment: "cable", difficulty: "intermediate", video_url: null, instructions: ["Poleas en posicion alta", "Tirar hacia abajo y al centro", "Mantener ligera flexion en los codos"] },
  { name: "Dominadas", muscle_group: "back", equipment: "bodyweight", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=eGo4IYlbE5g", instructions: ["Agarre prono mas ancho que los hombros", "Activar escapulas antes de tirar", "Llevar el pecho hacia la barra"] },
  { name: "Remo con barra", muscle_group: "back", equipment: "barbell", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=9efgcAjQe7E", instructions: ["Torso inclinado 45 grados", "Tirar hacia el ombligo", "Apretar la espalda en la contraccion"] },
  { name: "Remo con mancuerna", muscle_group: "back", equipment: "dumbbell", difficulty: "beginner", video_url: null, instructions: ["Apoyar rodilla y mano en el banco", "Tirar el codo hacia el techo", "No rotar el torso"] },
  { name: "Jalon al pecho", muscle_group: "back", equipment: "cable", difficulty: "beginner", video_url: "https://www.youtube.com/watch?v=CAwf7n6Luuc", instructions: ["Agarre prono mas ancho que hombros", "Tirar hacia el pecho", "Abrir el pecho en la bajada"] },
  { name: "Peso muerto convencional", muscle_group: "back", equipment: "barbell", difficulty: "advanced", video_url: "https://www.youtube.com/watch?v=op9kVnSso6Q", instructions: ["Pies al ancho de cadera", "Barra pegada a las piernas", "Caderas y hombros suben juntos", "Espalda neutra"] },
  { name: "Peso muerto rumano", muscle_group: "back", equipment: "barbell", difficulty: "intermediate", video_url: null, instructions: ["Rodillas ligeramente flexionadas", "Bajar la barra deslizando por las piernas", "Empujar caderas hacia atras"] },
  { name: "Press militar con barra", muscle_group: "shoulders", equipment: "barbell", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=2yjwXTZQDDI", instructions: ["De pie o sentado", "Barra desde la altura de la barbilla", "Empujar en linea recta hacia arriba"] },
  { name: "Press con mancuernas sentado", muscle_group: "shoulders", equipment: "dumbbell", difficulty: "beginner", video_url: null, instructions: ["Banco con respaldo", "Mancuernas a la altura de las orejas", "Extender hacia arriba"] },
  { name: "Elevaciones laterales", muscle_group: "shoulders", equipment: "dumbbell", difficulty: "beginner", video_url: "https://www.youtube.com/watch?v=3VcKaXpzqRo", instructions: ["Ligera flexion en los codos", "Elevar hasta la altura de los hombros", "No usar impulso"] },
  { name: "Pajaro - deltoides posterior", muscle_group: "shoulders", equipment: "dumbbell", difficulty: "beginner", video_url: null, instructions: ["Inclinado hacia adelante", "Codos ligeramente flexionados", "Elevar abriendo brazos"] },
  { name: "Curl de biceps con barra", muscle_group: "arms", equipment: "barbell", difficulty: "beginner", video_url: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo", instructions: ["Codos pegados al cuerpo", "No balancear el torso", "Contraer el biceps arriba"] },
  { name: "Curl martillo", muscle_group: "arms", equipment: "dumbbell", difficulty: "beginner", video_url: null, instructions: ["Agarre neutro", "Trabaja el braquiorradial", "Codos fijos"] },
  { name: "Curl en banco Scott", muscle_group: "arms", equipment: "barbell", difficulty: "intermediate", video_url: null, instructions: ["Codos apoyados en el banco", "Elimina el impulso", "Bajar con control"] },
  { name: "Extension de triceps en polea", muscle_group: "arms", equipment: "cable", difficulty: "beginner", video_url: null, instructions: ["Codos pegados al cuerpo", "Extender completamente", "Pausar en la contraccion"] },
  { name: "Press frances", muscle_group: "arms", equipment: "barbell", difficulty: "intermediate", video_url: null, instructions: ["Acostado barra sobre la frente", "Codos apuntan al techo", "No mover los codos"] },
  { name: "Fondos en banco para triceps", muscle_group: "arms", equipment: "bodyweight", difficulty: "beginner", video_url: null, instructions: ["Manos en el borde del banco", "Cuerpo pegado al banco", "Bajar hasta 90 grados"] },
  { name: "Sentadilla con barra", muscle_group: "legs", equipment: "barbell", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=ultWZbUMPL8", instructions: ["Barra en trapecios", "Pies al ancho de hombros", "Bajar hasta paralelo", "Rodillas sobre los pies"] },
  { name: "Sentadilla goblet", muscle_group: "legs", equipment: "kettlebell", difficulty: "beginner", video_url: null, instructions: ["Mancuerna frente al pecho", "Talones en el suelo", "Bajar profundo"] },
  { name: "Prensa de piernas", muscle_group: "legs", equipment: "machine", difficulty: "beginner", video_url: null, instructions: ["Pies al ancho de hombros", "No bloquear rodillas", "Rango completo"] },
  { name: "Extension de cuadriceps", muscle_group: "legs", equipment: "machine", difficulty: "beginner", video_url: null, instructions: ["Apoya-piernas a los tobillos", "Extender completamente", "Bajar con control"] },
  { name: "Curl femoral acostado", muscle_group: "legs", equipment: "machine", difficulty: "beginner", video_url: null, instructions: ["Tobillos bajo el rodillo", "Llevar talones a los gluteos", "Pausar en la contraccion"] },
  { name: "Zancadas", muscle_group: "legs", equipment: "dumbbell", difficulty: "beginner", video_url: "https://www.youtube.com/watch?v=QOVaHwm-Q6U", instructions: ["Paso largo hacia adelante", "Rodilla trasera baja", "Rodilla delantera no sobrepasar el pie"] },
  { name: "Sentadilla bulgara", muscle_group: "legs", equipment: "dumbbell", difficulty: "advanced", video_url: "https://www.youtube.com/watch?v=2C-uNgKwPLE", instructions: ["Pie trasero en banco", "Bajar verticalmente", "Torso erguido"] },
  { name: "Hip thrust con barra", muscle_group: "glutes", equipment: "barbell", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=LM8XHLYJoYs", instructions: ["Hombros en banco", "Barra sobre caderas con almohadilla", "Empujar caderas al techo", "Apretar gluteos arriba"] },
  { name: "Patada de gluteo en polea", muscle_group: "glutes", equipment: "cable", difficulty: "beginner", video_url: null, instructions: ["Tobillo en la polea baja", "Extender la pierna atras", "No arquear la espalda"] },
  { name: "Abduccion de cadera en maquina", muscle_group: "glutes", equipment: "machine", difficulty: "beginner", video_url: null, instructions: ["Sentarse con rodillas juntas", "Abrir contra la resistencia", "Volver lentamente"] },
  { name: "Plancha frontal", muscle_group: "core", equipment: "bodyweight", difficulty: "beginner", video_url: null, instructions: ["Cuerpo en linea recta", "Activar abdomen y gluteos", "Respirar con normalidad"] },
  { name: "Crunch abdominal", muscle_group: "core", equipment: "bodyweight", difficulty: "beginner", video_url: null, instructions: ["No jalar del cuello", "Subir la espalda baja del suelo", "Bajar con control"] },
  { name: "Elevacion de piernas colgado", muscle_group: "core", equipment: "bodyweight", difficulty: "intermediate", video_url: null, instructions: ["Colgado de la barra", "Levantar piernas a la horizontal", "Bajar sin balancear"] },
  { name: "Plancha lateral", muscle_group: "core", equipment: "bodyweight", difficulty: "beginner", video_url: null, instructions: ["Apoyo en un codo", "Cadera elevada y alineada", "Posicion estatica"] },
  { name: "Russian twist", muscle_group: "core", equipment: "other", difficulty: "beginner", video_url: null, instructions: ["Sentado con rodillas flexionadas", "Rotar de lado a lado", "Con o sin peso"] },
  { name: "Dead bug", muscle_group: "core", equipment: "bodyweight", difficulty: "beginner", video_url: null, instructions: ["Acostado brazos y piernas al aire", "Bajar brazo y pierna opuestos", "Alternar lados"] },
  { name: "Caminata en cinta", muscle_group: "cardio", equipment: "machine", difficulty: "beginner", video_url: null, instructions: ["Inclinacion 1-2%", "Velocidad 5-7 km/h", "Postura erguida"] },
  { name: "Bicicleta estatica", muscle_group: "cardio", equipment: "machine", difficulty: "beginner", video_url: null, instructions: ["Asiento a la altura de la cadera", "Resistencia moderada", "Cadencia 70-90 RPM"] },
  { name: "Remo ergometro", muscle_group: "cardio", equipment: "machine", difficulty: "intermediate", video_url: null, instructions: ["Empujar con las piernas primero", "Inclinar el torso", "Tirar de los brazos"] },
  { name: "Salto a la cuerda", muscle_group: "cardio", equipment: "other", difficulty: "beginner", video_url: null, instructions: ["Saltar con ambos pies", "Rotacion con las munecas", "Codos cerca del cuerpo"] },
  { name: "Burpees", muscle_group: "full_body", equipment: "bodyweight", difficulty: "intermediate", video_url: null, instructions: ["Posicion de plancha", "Flexion opcional", "Saltar con brazos arriba"] },
  { name: "Kettlebell swing", muscle_group: "full_body", equipment: "kettlebell", difficulty: "intermediate", video_url: "https://www.youtube.com/watch?v=YSxHifyI6s8", instructions: ["Empujar caderas atras", "Movimiento de bisagra de cadera", "El impulso viene de las caderas"] },
  { name: "Mountain climbers", muscle_group: "full_body", equipment: "bodyweight", difficulty: "beginner", video_url: null, instructions: ["Posicion de plancha alta", "Rodillas alternadas al pecho", "Caderas niveladas"] },
  { name: "Box jump", muscle_group: "full_body", equipment: "other", difficulty: "intermediate", video_url: null, instructions: ["Salto explosivo", "Aterrizar en el centro de la caja", "Bajar caminando"] },
  { name: "Thruster con mancuernas", muscle_group: "full_body", equipment: "dumbbell", difficulty: "intermediate", video_url: null, instructions: ["Sentadilla completa", "Empujar brazos al levantarse", "Movimiento continuo"] },
]

const { data, error } = await supabase.from('exercises').insert(exercises).select('id')

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
} else {
  console.log(`✓ ${data.length} ejercicios insertados correctamente`)
}
