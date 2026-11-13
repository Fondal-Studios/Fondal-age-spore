# Especificación de los cuerpos celulares pintados: 1 basal + 4 ramas x 3 niveles de evolución.
# Cada nivel suma estructuras reales de la biología celular y cambia la silueta, para que la mejora se note a simple vista.
CELLS = {
 'basal': {'ref': 'citoplasma', 'prompt': 'a simple primordial teal cell, round, one pale nucleus, a few tiny granules, humble and cute'},
 # Depredador (rojo): fagocitosis -> pseudópodos -> tricocistos y citoesqueleto
 'pred1': {'ref': 'mandibula', 'prompt': 'a crimson-red amoeba-like predator cell, slightly irregular body, one small pseudopod bulging out, a food vacuole with a captured bit inside, nucleus visible'},
 'pred2': {'ref': 'zarpazo', 'prompt': 'a crimson-red predator cell with several broad pseudopods reaching outward, two food vacuoles, lysosomes, mitochondria, a short whip-like flagellum, fiercer look'},
 'pred3': {'ref': 'apex', 'prompt': 'an apex predator cell, deep red and orange, large muscular body with radiating actin filaments visible, rows of tiny sharp trichocyst spines around the edge, big pseudopods, glowing orange ATP energy veins, many organelles, imposing and elegant'},
 # Parásito (violeta): haustorios -> toxinas -> manipulación
 'para1': {'ref': 'ventosas', 'prompt': 'a violet parasite cell, oval, small hair-like probes and one tiny sucker-tip on the front, a nucleus and a few dark granules'},
 'para2': {'ref': 'toxina', 'prompt': 'a violet parasite cell with three curved haustorium tentacles ending in small suction tips, toxin vesicles glowing green inside, extrusome spikes, mitochondria'},
 'para3': {'ref': 'huesped', 'prompt': 'a master parasite cell, deep purple and magenta, many long wavy tendrils with hooks, glowing toxic green vesicles, a pattern of shifting antigen markers like colored dots on the membrane, menacing and elegant'},
 # Fotosintético (verde): cloroplasto -> tilacoides -> floración
 'foto1': {'ref': 'cloroplasto', 'prompt': 'a green photosynthetic cell with a thin cell wall, two oval chloroplasts with tiny stacked grana, a pale nucleus, gentle sunlit glow'},
 'foto2': {'ref': 'fotosintesis', 'prompt': 'a green photosynthetic cell with a visible double cell wall, four chloroplasts with detailed stacked thylakoid grana, a central vacuole, starch granules, small light rays hitting it'},
 'foto3': {'ref': 'floracion', 'prompt': 'a radiant alga cell, emerald green and golden, many chloroplasts full of grana, carotenoid orange accents, soft petal-like flaps of pigment around the rim like a flower, glowing with sunlight and bubbles of oxygen, majestic'},
 # Colonial (naranja): adhesión -> gemación -> colonia esférica
 'colo1': {'ref': 'adhesion', 'prompt': 'a pair of round amber-orange cells touching, joined by tiny junction dots, each with a purple nucleus, little cute microscopic colony'},
 'colo2': {'ref': 'colonial', 'prompt': 'a colony of five amber-orange cells joined in a cluster, one small bud growing off the side, connected by thin cytoplasmic bridges, each cell with a nucleus'},
 'colo3': {'ref': 'grancolonia', 'prompt': 'a large spherical colony like Volvox: a hollow ring of many small amber-orange and golden cells arranged in a circle, a few bigger germ cells inside, shared gel matrix glowing, flagella hairs on the outer edge, intricate and beautiful'},
}


# Apéndices y orgánulos sueltos, pintados uno por uno (se acoplan al cuerpo y se animan en el juego).
# Todos se piden "horizontales, apuntando a la derecha, con el extremo de unión a la izquierda".
TRAITS = {
 'tr_flagelo': {'ref': 'flagelo', 'prompt': 'one single long wavy whip-like flagellum tail, thin and elegant, attached end on the left, slender S-curve extending to the right'},
 'tr_cilios': {'ref': 'cilios', 'prompt': 'a short row of seven fine curved cilia hairs standing up from a thin base line, delicate and flowing'},
 'tr_seudopodo': {'ref': 'mandibula', 'prompt': 'one rounded soft pseudopod lobe, a blobby translucent pink protrusion with a small food vacuole inside, base on the left, bulging to the right'},
 'tr_tricocisto': {'ref': 'zarpazo', 'prompt': 'one single sharp trichocyst dart spine, a slim needle-like harpoon with a small barbed tip, base on the left pointing to the right'},
 'tr_haustorio': {'ref': 'ventosas', 'prompt': 'one single curved parasitic tentacle ending in a round sucker tip with tiny ring teeth, base on the left, curling to the right'},
 'tr_rizoide': {'ref': 'quietud', 'prompt': 'one branching rhizoid root with fine root hairs, brownish, trunk on the left splitting into three thin roots to the right'},
 'tr_mitocondria': {'ref': 'mitocondrias', 'prompt': 'one single glossy orange mitochondrion, bean-shaped with wavy folded cristae inside, horizontal'},
 'tr_cloroplasto': {'ref': 'cloroplasto', 'prompt': 'one single glossy green chloroplast, oval with stacked grana discs inside, horizontal'},
 'tr_ojo': {'ref': 'deteccion', 'prompt': 'one small red eyespot stigma, a glossy red round pigment spot inside a pale green oval pocket, with a tiny white highlight'},
 'tr_vacuola': {'ref': 'vacuola', 'prompt': 'one single large translucent blue contractile vacuole bubble with tiny dissolved sparkles inside and a soft white highlight'},
}
CELLS.update(TRAITS)
