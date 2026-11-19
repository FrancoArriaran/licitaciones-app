// n8n Code node -- "Armar prompt LLM"
// Input: one item per form submission, with fields company_name, ruc,
// whatsapp_phone, departments, business_description, min_amount, max_amount
// (as produced by the n8n Form Trigger node).
// Output: same fields plus a `prompt` field ready for the OpenAI node.

const CATALOG = `7214 - Servicios de mantenimiento de pistas y carreteras
1510 - Diesel
8110 - Ingeniería arquitectónica
7212 - Servicios de construcción de escuelas
3011 - Cemento
8013 - Alquiler de instalaciones comerciales o industriales
7215 - Servicios de construcción de campos deportivos interiores
9210 - Servicios de vigilancia
8010 - Administración o planificación de proyectos
5013 - Leche o productos de mantequilla estables sin refrigerar
9111 - Servicios de cocina o preparación de comidas
7710 - Servicios de control de calidad ambiental
8312 - Servicios relacionados con Internet
7811 - Alquiler de vehículos
7611 - Servicios de limpieza de edificios
5022 - Granos de cereal
7810 - Servicios de transporte regional o nacional en camión
5019 - Papas fritas en hojuelas y al hilo, mix de bocaditos o galletas saladas
2510 - Camiones ligeros o vehículos de utilidad deportiva
3012 - Asfalto
8014 - Gestión de eventos
1111 - Grava
3010 - Varillas de hierro
8111 - Servicio de licencias para software de computadoras
9315 - Gestión de inversiones públicas o presupuestarias
8311 - Servicios de telefonía móvil
7711 - Servicios de descontaminación ambiental
8210 - Publicidad en Internet
8212 - Impresión tipográfica o serigrafía
8516 - Mantenimiento o reparación de bienes de equipo médico
7818 - Reparación y mantenimiento de camión ligero automotriz
7315 - Servicio de reparación y mantenimiento de equipo eléctrico
8114 - Servicio de inspección de instalaciones sanitarias o alcantarillado
5012 - Pescado estable sin refrigerar
4111 - Accesorios o suministros de analizadores de banco de sangre
7612 - Disposición final para desechos peligrosos
1511 - Gas de petróleo licuefactado
7210 - Reparación o mantenimiento del sistema de plomería
3013 - Ladrillos de cerámica
8411 - Servicio de contabilidad de inventarios
5310 - Uniformes
4017 - Tubería comercial de PVC
8011 - Desarrollo de gestión
8116 - Servicio de arrendamiento o alquiler de plataforma o equipo de comunicación de datos
1010 - Ganado vacuno
8610 - Desarrollo de fuerza de trabajo del sector administrativo
2611 - Generadores diesel
5512 - Tarjetas o carnets de identificación o productos similares
4220 - Unidades de ecografía o ecografía de pulso o doppler o ultrasonido médico para uso diagnóstico general
8310 - Servicios de transmisión de energía eléctrica
7814 - Servicios de expedición de carga
9012 - Agencias de viajes
8016 - Servicios de oficina
8512 - Servicios de laboratorios de radiografías
4321 - Servidor de computadora
1015 - Semillas o plántulas de césped
4227 - Cilindros de gas médicos o dispositivos relacionados
8510 - Servicio para administrar consultorios médicos
5011 - Pollo mínimamente procesado sin aditivos
9011 - Hoteles
8012 - Servicios de investigación legal
8413 - Seguro de vida
5015 - Aceites comestibles vegetales o de plantas
4010 - Aires acondicionados y accesorios
4222 - Kits o accesorios de bombas de infusión
1012 - Alimentación compuesta
2411 - Bolsas de plástico
8115 - Levantamiento del terreno
5510 - Publicaciones periodicas
2517 - Neumáticos para camiones pesados
1235 - Sales metálicas inorgánicas
2410 - Compactador estacionario para basura
2110 - Trituradoras de martillo
2711 - Segadora de césped
4710 - Digestores de lodos o aguas residuales
1112 - Madera tornillo
3026 - Lámina de acero corrugado
7017 - Servicios de administración de sistemas de riego
7610 - Servicios de desinfección o deodorización
8412 - Servicios de custodia de valores
9314 - Servicios de seguridad o salud ocupacional
9510 - Granja
2210 - Retroexcavadoras
1214 - Cloro (Cl)
4223 - Fórmulas suplementarias de adulto para uso general
5020 - Agua
9512 - Parque
8612 - Programas de postgrado
4213 - Uniformes para el personal médico
2513 - Aviones objetivo o de reconocimiento
4218 - Unidades o accesorios de signos vitales multiparámetros
5016 - Azúcares naturales o productos edulcorantes
7011 - Servicios de gestión o mantenimiento de parques
5311 - Zapatos para caballero
3017 - Puertas de madera
1512 - Aceite de motor
3912 - Fuente de energía ininterrumpida UPS
2612 - Cable de cobre
5119 - Electrolitos de cloruro de sodio
4323 - Software de protección antivirus y de seguridad de transacciones
4110 - Concentradores de vacío o centrífugos
8414 - Proveedores de servicios de tarjetas de crédito
1017 - Mezclas Nitrógeno Fósforo Potasio
4322 - Equipo de acceso satelital
5199 - Medicamentos y productos farmacéuticos
5612 - Escritorios para estudiantes
1411 - Formularios o cuestionarios comerciales
7211 - Servicios de remodelación de dormitorios colectivos
3015 - Techado prearmado
8213 - Servicios de producción de videos
8410 - Asistencia financiera
4618 - Botas de seguridad
4229 - Accesorios de depósito de autotransfusión
7015 - Servicios de administración forestal
5120 - Gamma IGG o immunoglobulina
1019 - Insecticidas
4016 - Filtros de aceite
7813 - Almacenamiento de muebles
8515 - Servicios de análisis de alimentos
8614 - Servicios de biblioteca o documentación
3016 - Pisos de caucho
5610 - Escritorios
9313 - Servicios de suministro de alimentos
4219 - Camas de cuidado del paciente o accesorios de uso general
4912 - Carpas
5212 - Frazadas
4810 - Molinos de alimentos de uso comercial
2312 - Maquinaria para bordados
7314 - Servicios de costura industrial
1310 - Caucho procesado y sintético
4215 - Unidades de curación de laboratorio dental
4216 - Soluciones para diálisis peritoneal
4228 - Esterilizadores o autoclaves de vapor
5313 - Productos para la protección contra el sol
7013 - Análisis de fertilidad del suelo
7318 - Servicios de fresado químico
1216 - Aditivo de concreto
5113 - Albúmina humana
5312 - Mochilas
4214 - Jeringas médicas con aguja
4224 - Dispositivos prostéticos de la extremidad inferior
7316 - Servicios de fabricación de aeronaves o naves espaciales
2610 - Motor fuera de borda a gasolina
4015 - Bombas sumergibles
5216 - Televisores
7299 - Servicios de Construcción y Mantenimiento
7899 - Servicios de Transporte, Almacenaje y Correo
3121 - Pinturas al esmalte
4617 - Grabadoras de sonido o video de vigilancia
7712 - Servicios de tratamiento de aguas superficiales
1116 - Tejidos de lana de ligamento de sarga
2613 - Conmutadores de control de carga de subestación
5114 - Valproato sódico
1013 - Jaulas o sus accesorios
1219 - Solventes activos
4512 - Videocámaras o cámaras de video digitales
5118 - Insulina
8017 - Servicio de asesoría y relaciones con los medios de comunicación
4713 - Productos de lavandería (Cloro, Detergente, Suavizante)
7812 - Carga y descarga de mercancías
3018 - Inodoros
5042 - Lentejas secas
6014 - Juegos educativos
5611 - Asientos de auditorio, estadio o de uso especial
3115 - Cable de acero no eléctrico
3910 - Lámpara cialítica de cirugía que no produce sombra
4014 - Mangueras especiales
2511 - Barco de personal de gas o petróleo
3116 - Gavión
8613 - Servicio de entrenamiento ejecutivo
2519 - Sistemas de ensayo o mantenimiento de apoyo terrestre
4212 - Productos formadores de sangre o sangre para uso veterinario
7014 - Servicios de secadoras de granos
7110 - Servicios de voladura de mina
4410 - Tóner para impresora o fax
5018 - Pan fresco
9212 - Servicios de vigilantes
1113 - Semen
3911 - Iluminación para pistas y carreteras
4231 - Apósitos de película transparente
4511 - Sistemas de videoconferencia
5111 - Trastuzumab
8211 - Servicios de redacción de manuales
8215 - Servicios de escultores
2413 - Congeladores verticales
3022 - Estructuras Permanentes
5121 - Iopamidol
5214 - Moledoras de café domésticas
7116 - Servicios de base costera
6012 - Carteles
8214 - Servicios de edición de gráficos o diseños
7312 - Servicios de corte de metales
1016 - Cacaos
3210 - Circuito integrado de procesador de video o medios de comunicación
4217 - Desfibriladores externos automatizados (DEA) o paletas rígidas
4411 - Organizadores o cajas de almacenamiento de archivos
7115 - Backup y almacenamiento de datos
4112 - Tubos de ensayo multipropósito o generales
4232 - Prótesis para hemiartroplastía de cadera de una pieza
4619 - Extintores
4712 - Bolsas de basura
5117 - Magaldrato
5147 - Gluconato de clorhexidina
2012 - Sistemas de topografía
4018 - Sistema de tuberías de plástico PAD
5110 - Amoxicilina
9513 - Oficina de emplazamiento
1115 - Hebras de lana
2412 - Sacos para empaquetado
3120 - Adhesivos químicos
4225 - Aparatos de terapia ultrasónica o suministros
4320 - Unidades de discos duros
4910 - Medallas
6010 - Materiales de apoyo de la unidad temática
2315 - Maquinaria de formar, rellenar o sellar
4924 - Toboganes para parques infantiles
5050 - Suplemento multivitaminico
5115 - Bromhidrato de escopolamina
7010 - Servicios de investigación o experimentación pesquera
3126 - Cubiertas y cajas metálicas
3215 - Caja de distribución eléctrica para sistema de control
8015 - Servicios de información comercial
9317 - Procedimientos o políticas de comercio mundial
9413 - Servicios no gubernamentales de asistencia técnica
1011 - Tazones y equipos para comida de animales domésticos
2318 - Maquinaria para la elaboración de alimentos
3019 - Caseta de obra
4811 - Máquinas dispensadoras de productos en envases pequeños o snacks
5124 - Calamina/fenol/óxido de zinc
5137 - Buprenorfina
5141 - Alteplasa
5614 - Bol de metal
7012 - Nutrición de animales
8611 - Enseñanza de idiomas extranjeros por inmersión
2316 - Calderos de fundición
4230 - Modelos anatómicos humanos para educación o capacitación médica
4616 - Señales de trafico (vallas, anuncios)
5138 - Acetaminofen
2111 - Redes para pesca comercial
2310 - Maquinaria para trabajar madera, piedra, cerámica y similares
2327 - Máquina de Soldadura Ultrasónica por fusión
4610 - Municiones para defensa u orden público
4711 - Lavadoras tipo lavandería
5010 - Nueces y semillas enteras
5213 - Cortinas
6013 - Trompetas
7016 - Servicios de manejo de ecosistemas marinos
7112 - Servicios de mantenimiento de tubos del yacimiento petrolero
9310 - Servicios de estadistas
2014 - Tanque colector de plástico
2414 - Sellos de seguridad o a prueba de entremetido
2712 - Prensa hidráulica industrial
4319 - Teléfonos móviles
4412 - Bolígrafos
4615 - Barreras
5040 - Cebollas rojas
5116 - Poractant alfa
5144 - Gadolinio
5613 - Canastas de productos
8112 - Análisis macroeconómico
9014 - Eventos deportivos profesionales patrocinados por la empresa
9514 - Garita de vigilancia
2324 - Máquina de aserrar y trocear
2518 - Remolques de plataforma
3140 - Juegos de juntas troqueladas
3141 - Sello mecánico de fuelle
4920 - Máquinas de ejercicios múltiples
5112 - Losartán potásico
7613 - Limpieza de derrames de sustancias toxicas
2011 - Equipo de perforación de pozos de agua
2311 - Maquinaria para destilación de crudo
2314 - Equipo para talleres de trabajo en cuero
2320 - Equipo de secado industrial
2713 - Juego de herramientas neumáticas
3118 - Prensaestopas
4916 - Balones de fútbol
4922 - Colchonetas o almohadillas deportivas
5127 - Remifentanilo
5128 - Ceftazidima
7311 - Servicios de fabricación de muebles
2516 - Bicicletas
2520 - Sistemas de extinción o de Control de incendios de aeronaves
3014 - Ladrillos aislantes térmicos
3117 - Rodamientos de bolas
3125 - Actuadores eléctricos
3212 - Inversores
5017 - Especias o extractos
5030 - Naranjas valencia
5126 - Tamsulosina
5134 - Aciclovir o aciclovir
5142 - Budesonida
5511 - Libros en cinta o disco compacto
7111 - Servicios de video de fondo de pozo del registro de producción
72 - Servicios de construcción y mantenimiento de instalaciones y edificios
7317 - Servicios de fabricación de equipos fotográficos u ópticos
78 - Servicios de transporte, almacenamiento y correspondencia
9211 - Defensa civil
9312 - Servicios de terceros en las negociaciones o demandas territoriales
9316 - Sistemas tributarios
1311 - Polietileno de baja densidad lineal
2010 - Cribas
2325 - Troquel para estampado
3024 - Tabla base para tribuna y accesorios
3119 - Cuentas de vidrio
3913 - Accesorio de conducto eléctrico
4119 - Procesador de tejidos automatizado
4221 - Audifono para personas con problemas auditivos
4226 - Transportadores de cadáveres
4514 - Fijador
5129 - Aripiprazol
5130 - Posaconazol
5140 - Olanzapina
5143 - Atomoxetina
5146 - Condroitina/glucosamina/hialuronato
5215 - Cuchillos panaderos
9010 - Servicios de reparto de comidas y bebidas
9015 - Servicio de asistencia personal
9299 - Servicios de Defensa Nacional, Orden Público y Seguridad
9511 - Calle o avenida o carretera o bulevar
1412 - Papel de seda Kraft
2313 - Alisadoras de ruedas de esmerilar
2322 - Aturdidor
2323 - Rodillo de fijación
2330 - Equipo para montaje de terminales y corte de cables y alambres
3137 - Ladrillos moldeados
4510 - Consumibles para impresión offset
4622 - Dispositivo antimanipulación de minas
4914 - Instrumentos o accesorios para buceo
4921 - Equipos de orientación
5133 - Clorpromazina
5135 - Estradiol/hidroxiprogesterona
5145 - Albendazol
7713 - Servicios de control de ruidos
8113 - Análisis multivariado
8526 - Diagnóstico de Sobrecarga de líquidos
1014 - Sillas de montar
1020 - Rosal vivo fragancia púrpura
1021 - Retama viva escocesa amarilla
1031 - Azucena agua fresca cortada
1110 - Carbón activado
1213 - Bengalas
1217 - Colorantes fdc seguros para alimentos, fármacos o cosméticos
1218 - Aceites sintéticos
2328 - Máquina de calefacción por inducción
2614 - Plomo para blindaje contra la radiación
3128 - Componentes laminados compuestos
3133 - Conjuntos estructurales de latón con acabado ligado
3211 - Transistor bipolar o de radiofrecuencia bipolar
3213 - Soportes o zócalos de circuito integrado
4099 - Sistemas, Equipos y Componentes de Distribución y Acondicionamiento
4120 - Ensayo de endotoxinas
4614 - Lanzadores de cohetes
4812 - Ruletas
4917 - Barras de equilibrio para gimnasia
5038 - Purés de aceituna sevillano
5139 - Albuterol
5210 - Alfombras sintéticas
5410 - Pulseras
9410 - Asociaciones de abogados
9412 - Servicios de promotores o gestores de clubes deportivos
1034 - Ramo de peonia, clavel y rosa frescas cortadas
1050 - Acacia púrpura fresca cortada
1114 - Desperdicios o restos de caucho
2013 - Arenas de fracturamiento cubiertas de resina
2319 - Mezcladora de arena
2321 - Sistema de marcación de panel de circuito impreso
2515 - Estructuras de naves espaciales
3122 - Extractos inorgánicos para curtidos
3123 - Metal precioso en barra mecanizada
3124 - Bóvedas de policarbonato moldeado
3131 - Conjuntos de tubería de acero al carbono de soldadura sónica
3136 - Conjuntos de placas de aluminio soldados o soldados en fuerte
4118 - Sistema de prueba inmunológica de autoanticuerpos contra la tiroides
4513 - Cintas de video en blanco
4611 - Granadas
50 - Alimentos y bebidas para consumo humano
5043 - Arvejas orgánicas secas de jardín
5131 - Bosentan
5132 - Ciprofibrato
5314 - Agujas de crochet
6011 - Botones decorativos
7113 - Servicios de bombeo de fondo de pozo
7310 - Servicios de fabricación de plásticos, resinas o fibras
8511 - Servicios de control o prevención de enfermedades coronarias
8513 - Servicios de investigación genética
8517 - Excavación de tumbas
90 - Servicios de viaje, alimentación, alojamiento y entretenimiento
9013 - Conciertos
9110 - Alquiler de disfraces`;

const item = $input.first().json;

const prompt = `Eres un clasificador que mapea la descripcion de una pequena empresa peruana a categorias UNSPSC (a nivel de familia, 4 digitos) usadas en licitaciones publicas del Peru.

Descripcion de la empresa:
"""
${item.business_description}
"""

Elige entre 1 y 4 familias UNSPSC de la siguiente lista (formato: codigo - descripcion) que mejor representen lo que esta empresa podria ofertar en una licitacion publica. Solo usa codigos que aparecen en la lista, no inventes ninguno.

${CATALOG}

Responde UNICAMENTE con un JSON valido, sin texto adicional, con este formato exacto:
{"families": ["CODIGO1", "CODIGO2"], "reasoning": "explicacion breve en espanol"}`;

return [{
  json: {
    ...item,
    prompt,
  },
}];
