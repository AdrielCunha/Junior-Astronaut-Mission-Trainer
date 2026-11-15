// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The in-game Wiki (title screen, WIKI): where each part of the game comes from. Every fact here is taken
// from the project itself (the data JSONs, the Blender scripts in tools/lua3d, README "NASA data") and
// every link is one the project already uses. A source with no url is the team's own script or model.
export type FonteWiki = { nome: string; url?: string };
// imagem: a picture the game already has (path under public/), or a frame of a texture already loaded.
export type ImagemWiki = string | { textura: string; quadro: number };
// comparacao: a NASA source next to what the game made from it (public/wiki/, made from the downloaded files).
export type ComparacaoWiki = { imagem: string; legenda: string };
export type EntradaWiki = { id: string; titulo: string; texto: string[]; fontes: FonteWiki[]; imagem?: ImagemWiki; comparacao?: ComparacaoWiki };
export type CategoriaWiki = { id: string; titulo: string; icone: string; entradas: EntradaWiki[] };

const RADLAB_LUA = 'https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=CRaTER-D1D2&timestamp%3E=2024-05-05&timestamp%3C2024-05-13&timestamp&absorbed_dose_rate&format=csv';
const RADLAB_NAVE = 'https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=BPD&timestamp%3E=2024-05-13&timestamp%3C2024-05-18&timestamp&absorbed_dose_rate&format=csv';
const RADLAB_MARTE = 'https://visualization.osdr.nasa.gov/radlab/api/?instrument_id=MSL-RAD-Surface&timestamp%3E=2024-05-18&timestamp%3C2024-05-26&timestamp&absorbed_dose_rate&format=csv';
const REMS = 'https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json';
const LOLA = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_80m.img';
const MOON_KIT = 'https://svs.gsfc.nasa.gov/4720';
const MOLA = 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/';
const DONKI_FLR = 'https://ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=2024-05-04&endDate=2024-05-12';
const DONKI_CME = 'https://ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=2024-05-04&endDate=2024-05-12';

export const WIKI: CategoriaWiki[] = [
  { id: 'mapas', titulo: 'Maps and ground', icone: 'moon', entradas: [
    { id: 'chao-lua', comparacao: { imagem: 'wiki/terreno_lua.png', legenda: "Proof: the NASA file and the game have the same height at all 4,225 points (less than 5 cm apart)." }, imagem: 'lua/terrain.png', titulo: 'The Moon base ground is real', texto: [
      "The ground under the Moon base was measured by NASA's LRO spacecraft, which mapped the Moon's height with a laser (LOLA).",
      'The game cut out the flattest 64 x 64 square on the rim of Shackleton crater, near the Moon\'s south pole.',
    ], fontes: [{ nome: 'LRO LOLA polar elevation (NASA PDS)', url: LOLA }, { nome: 'Team script: tools/lua3d/make_terrain.py' }] },
    { id: 'rampas', imagem: 'lua/moon_height.png', titulo: 'Slopes decide where you can go', texto: [
      'From the real heights, the game measures how steep each tile is.',
      'Tiles steeper than 20 degrees cannot be walked on, and modules need tiles under 10 degrees.',
    ], fontes: [{ nome: 'LRO LOLA polar elevation (NASA PDS)', url: LOLA }, { nome: 'Team script: tools/lua3d/make_terrain.py' }] },
    { id: 'globo-lua', comparacao: { imagem: 'wiki/globo_lua.png', legenda: "NASA color map of the Moon and the game's flat-color Moon made from it." }, imagem: 'lua/moon_albedo.png', titulo: 'The Moon globe', texto: [
      "When you zoom out, the Moon's colors come from NASA's LROC color map and its bumps from LOLA heights, both from the NASA SVS CGI Moon Kit.",
      'The bumps are drawn taller than real so you can see them: the real ones are only about 1% of the Moon\'s radius.',
    ], fontes: [{ nome: 'NASA SVS CGI Moon Kit', url: MOON_KIT }, { nome: 'Team script: tools/lua3d/make_moon.py' }] },
    { id: 'jezero', comparacao: { imagem: 'wiki/terreno_marte.png', legenda: "Proof: NASA heights and the game match 99.98% (about 1.6 m apart on average)." }, imagem: 'marte/terrain.png', titulo: 'The Mars map is Jezero crater', texto: [
      "The Mars map is a piece of Jezero crater, where NASA's Perseverance rover landed.",
      'Its heights come from a 20 m per pixel model made from Mars orbiter camera images, turned into square tiles for the game.',
    ], fontes: [{ nome: 'Mars 2020 CTX elevation model of Jezero (NASA PDS)', url: 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif' }, { nome: 'Team script: tools/lua3d/make_terrain_marte.py' }] },
    { id: 'globo-marte', comparacao: { imagem: 'wiki/globo_marte.png', legenda: "NASA Viking mosaic of Mars and the game's Mars made from it." }, imagem: 'lua/planetas/marte.png', titulo: 'The Mars globe', texto: [
      "The Mars globe is painted from NASA's Viking images, with bumps from MOLA heights measured by Mars Global Surveyor.",
      'The colors are reduced to a few flat tones to match the cartoon style of the game.',
    ], fontes: [{ nome: 'NASA 3D Resources: Mars (Viking, USGS)', url: 'https://science.nasa.gov/3d-resources/mars/' }, { nome: 'MGS MOLA heights (NASA PDS)', url: MOLA }] },
    { id: 'crateras', imagem: 'lua/modulos/deco_pedras.png', titulo: 'Craters and rocks are art', texto: [
      'The craters, rims and rocks on the maps are drawn by the team with code. They are not NASA measurements.',
      'They sit on top of the real ground. Jezero gets fewer, smaller craters, because its floor is an old lake bed.',
    ], fontes: [{ nome: 'Team script: tools/lua3d/render_terrain.py' }] },
  ] },
  { id: 'ceu', titulo: 'Sky and planets', icone: 'star', entradas: [
    { id: 'planetas', imagem: 'lua/sky_sistema.jpg', titulo: 'Where the planets really are', texto: [
      "The game works out where Earth, Mars and the other planets were on each real day of May 2024, using orbit numbers from NASA JPL.",
      'Their paths are real ellipses, with the Sun at one side, not in the middle.',
    ], fontes: [{ nome: 'NASA JPL: approximate planet positions', url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html' }] },
    { id: 'estrelas', imagem: 'lua/sky.jpg', titulo: 'The real star sky', texto: [
      'The stars come from a NASA star map, so every constellation is in its real place.',
      'A script cuts each constellation out of the map, so the game can draw them one by one.',
    ], fontes: [{ nome: 'NASA SVS Deep Star Maps 2020', url: 'https://svs.gsfc.nasa.gov/4851' }, { nome: 'Team script: tools/lua3d/make_constellations.py' }] },
    { id: 'fotos', comparacao: { imagem: 'wiki/globo_terra.png', legenda: "The Blue Marble picture and the game's Earth made from it." }, imagem: 'lua/planetas/terra.png', titulo: 'Planet pictures', texto: [
      'Mercury wears a real photo from the MESSENGER spacecraft, and Mars a mosaic from the Viking mission.',
      'Earth uses the famous Blue Marble picture (public domain).',
    ], fontes: [{ nome: 'MESSENGER global view (NASA Photojournal)', url: 'https://science.nasa.gov/photojournal/a-global-view-from-orbit' }, { nome: 'NASA 3D Resources: Mars', url: 'https://science.nasa.gov/3d-resources/mars/' }, { nome: 'Blue Marble (Wikimedia Commons)', url: 'https://commons.wikimedia.org/wiki/File:Whole_world_-_land_and_oceans_12000.jpg' }] },
    { id: 'voos', comparacao: { imagem: 'wiki/relevo_lua.png', legenda: "NASA LOLA heights of the whole Moon and the game's height map made from them." }, imagem: 'lua/viagem/foguete.png', titulo: 'Flying over the Moon and Mars', texto: [
      'The zoom-out films use real height maps, so the ground you fly over has its real shape.',
      'The Moon uses LOLA heights. Mars uses MOLA heights and orbiter camera pictures.',
    ], fontes: [{ nome: 'NASA SVS CGI Moon Kit', url: MOON_KIT }, { nome: 'MGS MOLA heights (NASA PDS)', url: MOLA }, { nome: 'Team scripts: tools/lua3d/make_flight.py, make_flight_marte.py' }] },
    { id: 'sol', imagem: 'lua/planetas/sol.png', titulo: 'The Sun and planet facts', texto: [
      'The Sun is a glowing ball the team made in Blender, not a photo.',
      'The facts you read about the planets, like how long a day lasts, come from the NASA planetary fact sheets.',
    ], fontes: [{ nome: 'NASA planetary fact sheets', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' }, { nome: 'Team script: tools/lua3d/make_sun.py' }] },
  ] },
  { id: 'base', titulo: 'Base and vehicles', icone: 'wrench', entradas: [
    { id: 'escudo', imagem: 'lua/modulos/blindagem_agua3.png', titulo: 'Radiation Shield: water walls', texto: [
      "The storm shelter's walls are water tanks, because water is a good shield against the radiation of a solar storm.",
      "NASA's crew health standard says a storm shelter in the crew quarters with about 10 cm of water around it protects astronauts from a very big solar storm. It can be made by moving water containers around the beds.",
      'In the game, the batteries pump the water into the walls before a storm. The antenna and sensor on top only warn the crew.',
    ], fontes: [{ nome: 'NASA-STD-3001: radiation protection (storm shelter)', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf' }, { nome: 'NASA: storm shelter shielding study (NTRS)', url: 'https://ntrs.nasa.gov/citations/20140000593' }, { nome: 'Team model: tools/lua3d/make_modules.py (blindagem)' }] },
    { id: 'suporte', imagem: 'lua/modulos/suporte.png', titulo: 'Life Support and air', texto: [
      "On the space station, NASA's life support recycles about 9 of every 10 drops of water and splits water to make the oxygen the crew breathes.",
      'NASA has also pulled oxygen out of simulated Moon soil using focused sunlight. That is the idea behind the Oxygen Plant. There is no air on the Moon, so the model has a sealed loop and no open fan.',
    ], fontes: [{ nome: 'NASA: Environmental Control and Life Support System', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' }, { nome: 'NASA: sunlight extracts oxygen from regolith', url: 'https://www.nasa.gov/centers-and-facilities/johnson/sunlight-extracts-oxygen-from-regolith-using-solar-chemistry/' }, { nome: 'Team model: tools/lua3d/make_modules.py' }] },
    { id: 'energia', imagem: 'lua/modulos/painel.png', titulo: 'Solar panels and Battery Bank', texto: [
      'The panels turn sunlight into power, and the Battery Bank stores it for the crew.',
      "At the Moon's south pole the Sun stays low, so shadows from hills can block flat panels. That is why NASA is testing tall solar arrays there, like the tilted panels on our base.",
    ], fontes: [{ nome: 'NASA: vertical solar arrays for the lunar surface', url: 'https://www.nasa.gov/technology/nasa-industry-to-mature-vertical-solar-array-technologies-for-lunar-surface/' }, { nome: 'Team models: tools/lua3d/make_solar_station.py, make_modules.py' }] },
    { id: 'lrv', imagem: 'lua/rover/lrv_5.png', titulo: 'The Apollo rover (LRV)', texto: [
      'Apollo 15, 16 and 17 astronauts drove a rover on the Moon. It traveled folded up inside the lander and opened with springs.',
      'Its wheels were made of wire mesh, much lighter than rubber tires. Our model has wire wheels, a thin deck and two seats. On Mars it is only a pretend copy.',
    ], fontes: [{ nome: 'NASA: Exploring the Moon (Apollo lunar rover)', url: 'https://ares.jsc.nasa.gov/interaction/lmdp/documents/58199main_exploring_the_moon.pdf' }, { nome: 'Team model: tools/lua3d/make_lrv.py' }] },
    { id: 'astronauta', imagem: { textura: 'astronauta_comandante', quadro: 0 }, titulo: 'The commander', texto: [
      "The commander walks with a Moon bunny hop, because the Moon's gravity is only 1.62 m/s², about one sixth of Earth's. Jumps float!",
      'The astronaut is drawn bigger than a real person so kids can see it on the map.',
    ], fontes: [{ nome: 'NASA Moon fact sheet', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html' }, { nome: 'Team model: tools/lua3d/make_astronaut.py' }] },
    { id: 'nave', imagem: 'nave/terrain.png', titulo: 'The ship and the cargo lander', texto: [
      "The ship follows NASA Marshall's Mars Transit Habitat concept: one big home for four astronauts during the long trip to Mars.",
      'The Moon has only a very thin exosphere, no real air, so the cargo lander cannot use a parachute: it fires its engine to land softly.',
    ], fontes: [{ nome: 'NASA Marshall: Transit Habitat concept (NTRS)', url: 'https://ntrs.nasa.gov/citations/20230007573' }, { nome: 'NASA: Moon facts', url: 'https://science.nasa.gov/moon/facts/' }, { nome: 'Team models: tools/lua3d/make_nave.py, make_modules.py' }] },
    { id: 'aquecedor', imagem: 'lua/modulos/aquecedor.png', titulo: 'Mars heating', texto: [
      "Mars nights are very cold. NASA's machines on Mars use heaters to keep their electronics warm: the Ingenuity helicopter's electronics could drop to about -80 °C on winter nights.",
      'In the game, each missing heating battery costs 10 oxygen. How cold each night gets comes from real Curiosity weather data.',
    ], fontes: [{ nome: 'NASA: Ingenuity adapts for Mars winter', url: 'https://science.nasa.gov/blog/ingenuity-adapts-for-mars-winter-operations/' }, { nome: 'Curiosity REMS weather (NASA)', url: REMS }] },
    { id: 'experimentos', imagem: 'lua/modulos/deco_refletor.png', titulo: 'Laser reflector and seismometer', texto: [
      'The laser reflector is a grid of mirrors left by Apollo. Scientists bounce lasers from Earth off it to measure how far the Moon is.',
      'The Apollo seismometer recorded moonquakes and meteorite hits, and gave the first look inside the Moon.',
    ], fontes: [{ nome: 'NASA NSSDCA: Apollo 14 laser reflector', url: 'https://nssdc.gsfc.nasa.gov/nmc/experiment/display.action?id=1971-008C-09' }, { nome: 'NASA: Apollo 11 seismic experiment', url: 'https://science.nasa.gov/resource/apollo-11-seismic-experiment/' }, { nome: 'Team models: tools/lua3d/make_modules.py' }] },
  ] },
  { id: 'dados', titulo: 'Real NASA data', icone: 'antenna', entradas: [
    { id: 'tempestade', comparacao: { imagem: 'wiki/radiacao_lua.png', legenda: "Bars: the game. Dots: NASA's data checked again today. They match every day." }, imagem: 'lua/planetas/sol.png', titulo: 'The real storm of May 2024', texto: [
      "On 11 May 2024 the Sun fired a giant X5.8 flare. NASA's LRO, orbiting the Moon, measured an average of 1,082.5 µGy/h that day.",
      'A calm day is about 5 µGy/h, so it was more than 200 times stronger. The dose was measured in lunar orbit, not on the ground.',
    ], fontes: [{ nome: 'LRO/CRaTER dose (NASA OSDR RadLab)', url: RADLAB_LUA }] },
    { id: 'niveis', titulo: 'How the storm level is found', texto: [
      'Each day\'s average radiation is compared with a calm day: under 1.6 times is CALM, under 10 is RISING, under 100 is HIGH, more is EXTREME.',
      'Example: 10 May 2024 averaged 229.7 µGy/h, about 46 times calm, so it was HIGH.',
    ], fontes: [{ nome: 'LRO/CRaTER dose (NASA OSDR RadLab)', url: RADLAB_LUA }] },
    { id: 'donki', imagem: 'lua/modulos/blindagem_agua1.png', titulo: 'Flares and solar clouds', texto: [
      "NASA's DONKI database records solar flares and CMEs (giant clouds of solar material). On 8 May 2024 a CME left the Sun at 1,257 km/s.",
      'The radiation alarms happen on the days the real Sun did something big. The morning warnings are the game\'s own forecast, not an official one.',
    ], fontes: [{ nome: 'Solar flares (NASA DONKI)', url: DONKI_FLR }, { nome: 'CMEs (NASA DONKI)', url: DONKI_CME }, { nome: 'NASA DONKI', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' }] },
    { id: 'viagem', comparacao: { imagem: 'wiki/radiacao_nave.png', legenda: "Bars: the game. Dots: NASA's data checked again today. They match every day." }, imagem: 'lua/modulos/foguete_voo.png', titulo: 'The trip to Mars', texto: [
      'A real trip to Mars takes about 7 to 10 months. The game makes it 5 days.',
      "Its radiation comes from NASA's BioSentinel in deep space: 175.1 µGy/h on 13 May and 380.7 on 14 May 2024, against a calm 6.3.",
    ], fontes: [{ nome: 'BioSentinel dose (NASA OSDR RadLab)', url: RADLAB_NAVE }] },
    { id: 'marte-dados', comparacao: { imagem: 'wiki/radiacao_marte.png', legenda: "Bars: the game. Dots: NASA's data checked again today. They match every day." }, imagem: 'lua/modulos/deco_estacao_tempo.png', titulo: 'Mars: a storm and a freezing night', texto: [
      'On 20 May 2024 Curiosity measured 69.3 µGy/h on Mars, about 18 times a calm day.',
      'On 18 May its weather station recorded a night low of -98 °C, so heating needs 2 batteries that night.',
    ], fontes: [{ nome: 'Curiosity RAD dose (NASA OSDR RadLab)', url: RADLAB_MARTE }, { nome: 'Curiosity REMS weather (NASA)', url: REMS }] },
    { id: 'real-simulado', titulo: 'What is real and what is a game', texto: [
      'Real: the storm days, the measured radiation and the Mars temperatures. They are archived NASA data, not live readings.',
      'Game: oxygen, batteries and the rocket. They are simple models to teach that in space every choice has a cost.',
    ], fontes: [{ nome: 'NASA OSDR RadLab', url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/' }] },
  ] },
  { id: "fatos", titulo: "Game facts and their sources", icone: "idea", entradas: [
    { id: "fatos-apollo", imagem: "lua/modulos/deco_modulo_descida.png", titulo: "Apollo on the Moon", texto: [
      "The bottom half of a lander. The top half flew back up; the legs and tanks stay on the Moon.",
      "Measures moonquakes. The Moon rumbles a little, and scientists use it to learn what is inside.",
      "Laser reflector. Scientists shoot lasers from Earth at it to measure the Moon distance very precisely.",
      "Apollo crews brought back 382 kg of Moon rocks and soil. Scientists still study them today!",
      "A probe that hit the ground too fast. Early robot missions crashed a lot before engineers got landings right.",
    ], fontes: [{ nome: "NASA: Apollo landing sites", url: "https://science.nasa.gov/resource/apollo-landing-sites/" }, { nome: "NASA: Apollo 11 seismic experiment", url: "https://science.nasa.gov/resource/apollo-11-seismic-experiment/" }, { nome: "NASA: Apollo laser ranging", url: "https://eclipse.gsfc.nasa.gov/SEhelp/ApolloLaser.html" }, { nome: "NASA: how the Moon formed (Apollo samples)", url: "https://science.nasa.gov/moon/formation/" }, { nome: "NASA: Rangers and Surveyors to the Moon", url: "https://science.nasa.gov/resource/nasa-facts-rangers-and-surveyors-to-the-moon/" }] },
    { id: "fatos-lua", imagem: "lua/moon_albedo.png", titulo: "The Moon itself", texto: [
      "On the Moon you weigh one sixth of what you weigh on Earth.",
      "At the lunar south pole the Sun never climbs high: it circles the horizon.",
      "From the Moon, Earth hardly moves in the sky!",
      "In 2009 NASA found water ice in a dark crater near the Moon's south pole.",
      "Earth has thick air and a magnetic shield. The Moon has neither!",
    ], fontes: [{ nome: "NASA: Moon facts", url: "https://science.nasa.gov/moon/facts/" }, { nome: "NASA: Shackleton crater's lit rim", url: "https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/" }, { nome: "NASA StarChild: Earth seen from the Moon", url: "https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question58.html" }, { nome: "NASA: LCROSS mission", url: "https://science.nasa.gov/mission/lcross/" }, { nome: "NASA: Earth facts", url: "https://science.nasa.gov/earth/facts/" }] },
    { id: "fatos-rovers", imagem: "lua/rover/lrv_5.png", titulo: "Moon cars", texto: [
      "Apollo astronauts drove it on the Moon in 1971 and 1972.",
      "Each wheel was made of wire mesh and had its own motor.",
      "The Apollo rover ran on two 36-volt batteries.",
      "The Apollo 17 rover reached about 18 km/h, a speed record on the Moon!",
      "NASA is working on a new Moon car for Artemis astronauts!",
    ], fontes: [{ nome: "NASA: Exploring the Moon (Apollo lunar rover)", url: "https://ares.jsc.nasa.gov/interaction/lmdp/documents/58199main_exploring_the_moon.pdf" }, { nome: "NASA NSSDCA: Apollo Lunar Roving Vehicle", url: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html" }, { nome: "NASA SP-350: Apollo 17 rover speed record", url: "https://www.nasa.gov/wp-content/uploads/static/history/SP-350/ch-14-8.html" }, { nome: "NASA: new Lunar Terrain Vehicle", url: "https://www.nasa.gov/humans-in-space/nasa-makes-progress-with-new-lunar-terrain-vehicle-moon-rover-services/" }] },
    { id: "fatos-marte", imagem: "lua/planetas/marte.png", titulo: "The planet Mars", texto: [
      "The biggest volcano in the solar system is on Mars! It is taller than 7,000 elephants standing on top of each other.",
      "Mars pulls you down less than Earth. You could jump about 2.6 times higher here!",
      "A year on Mars is almost 2 Earth years. You would wait almost twice as long for your birthday!",
      "A day on Mars is about 40 minutes longer than yours. Just enough for two cartoons!",
      "It snows on Mars! Some of the snow is frozen carbon dioxide, called dry ice.",
      "On Mars, sunsets are blue! On Earth they are orange.",
      "Mars has two small, lumpy moons: Phobos and Deimos! They may be captured asteroids.",
      "Dust storms on Mars can grow to cover much of the planet!",
      "Some rocks from Mars fell on Earth! A big crash threw them into space.",
    ], fontes: [{ nome: "NASA Photojournal: Olympus Mons", url: "https://science.nasa.gov/photojournal/olympus-mons/" }, { nome: "NASA Mars fact sheet", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html" }, { nome: "NASA JPL: dry ice snowfall on Mars", url: "https://www.jpl.nasa.gov/news/nasa-observations-point-to-dry-ice-snowfall-on-mars/" }, { nome: "NASA: sunset at Gale crater", url: "https://science.nasa.gov/resource/sunset-at-mars-gale-crater-curiosity/" }, { nome: "NASA: moons of Mars", url: "https://science.nasa.gov/mars/moons/" }, { nome: "NASA: Mars facts", url: "https://science.nasa.gov/mars/facts/" }, { nome: "NASA: meteors and meteorites", url: "https://science.nasa.gov/solar-system/meteors-meteorites/facts/" }] },
    { id: "fatos-robos", imagem: "lua/modulos/deco_ingenuity.png", titulo: "Robots on Mars", texto: [
      "A tiny helicopter flew here! It was the first to fly on another planet. It was meant to fly 5 times and flew 72!",
      "Rovers like NASA's Opportunity were built to work for 3 months. Opportunity kept going for almost 15 years!",
      "Mars shakes too! NASA's InSight lander, in another part of Mars, heard 1,319 marsquakes.",
      "A robot landed here all by itself. Mars is too far for anyone on Earth to steer it in time.",
      "In 2005 the Opportunity rover found a metal meteorite on Mars: the first meteorite ever found on another planet!",
      "NASA's Perseverance rover leaves sealed rock samples on Mars, for a future mission to bring home.",
    ], fontes: [{ nome: "NASA: the legacy of Ingenuity", url: "https://science.nasa.gov/resource/the-legacy-of-ingenuity-the-frontier-of-extraterrestrial-flight/" }, { nome: "NASA: Opportunity mission", url: "https://science.nasa.gov/mission/mer-opportunity/" }, { nome: "NASA: InSight mission retired", url: "https://www.nasa.gov/missions/insight/nasa-retires-insight-mars-lander-mission-after-years-of-science/" }, { nome: "NASA: how we land on Mars", url: "https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/how-we-land-on-mars/" }, { nome: "NASA JPL: Opportunity finds an iron meteorite", url: "https://www.jpl.nasa.gov/news/opportunity-rover-finds-an-iron-meteorite-on-mars/" }, { nome: "NASA JPL: Perseverance sample tubes", url: "https://www.jpl.nasa.gov/news/a-martian-roundtrip-nasas-perseverance-rover-sample-tubes/" }] },
    { id: "fatos-estacao", imagem: "lua/modulos/estufa.png", titulo: "Space station and spacecraft", texto: [
      "The Space Station's Cupola has 7 windows, with covers that close to protect the glass.",
      "Astronauts already grow lettuce on the Space Station!",
      "In 2020 astronauts on the Space Station found a tiny air leak by letting tea leaves float and watching where they drifted!",
      "In 2008 an astronaut lost a tool bag on a spacewalk. It circled the Earth for more than eight months, and skywatchers filmed it from the ground!",
      "In space nothing slows you down: a push keeps you moving until another push stops you.",
      "Radio signals travel at the speed of light. Far from Earth, messages take minutes.",
    ], fontes: [{ nome: "NASA: the Space Station Cupola", url: "https://www.nasa.gov/international-space-station/cupola" }, { nome: "NASA: Veggie plant system on the Space Station", url: "https://www.nasa.gov/missions/station/veggie-plant-growth-system-activated-on-international-space-station/" }, { nome: "Universe Today: crew finds the leak with tea leaves", url: "https://www.universetoday.com/articles/the-crew-of-the-iss-has-found-the-source-of-the-stations-air-leak" }, { nome: "Scientific American: lost tool bag reenters", url: "https://www.scientificamerican.com/blog/news-blog/tool-kit-dropped-from-space-station-2009-08-03/" }, { nome: "NASA Glenn: Newton's first law", url: "https://www.grc.nasa.gov/www/BGH/newton1.html" }, { nome: "NASA: how to talk to Perseverance", url: "https://science.nasa.gov/mission/mars-2020-perseverance/speaking-percys-language-how-to-talk-so-perseverance-will-listen/" }] },
    { id: "fatos-sol", imagem: "lua/planetas/sol.png", titulo: "The Sun and its storms", texto: [
      "Flares go A, B, C, M, X. X is the biggest! Sunlight reaches the Moon in 8 minutes.",
      "Flare light arrives in minutes. The fast particles come later.",
      "A CME is a giant cloud thrown by the Sun. It takes 1 to 3 days to reach Earth and the Moon.",
      "This storm made auroras on Earth, far from the poles!",
      "NASA's BioSentinel took tiny yeast cells to deep space to study radiation.",
    ], fontes: [{ nome: "NASA: solar storms and flares", url: "https://science.nasa.gov/sun/solar-storms-and-flares/" }, { nome: "NASA: protecting astronauts from radiation at the Moon", url: "https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/" }, { nome: "NASA heliophysics vocabulary", url: "https://science.nasa.gov/heliophysics/resources/vocabulary/" }, { nome: "NASA: tracking the May 2024 solar storm", url: "https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/" }, { nome: "NASA: BioSentinel deep space biology", url: "https://www.nasa.gov/feature/ames/artemis-i-to-launch-first-of-a-kind-deep-space-biology-mission" }] },
    { id: "diversao", imagem: "lua/modulos/deco_queijo.png", titulo: "Made for fun, not science", texto: [
      "Some things in this game are made up by the team to make it more fun. They are not NASA science.",
      "Made up for the game: the battery and oxygen rules, the 5-day trip to Mars, the craters and rocks drawn on the maps, the random events, and these jokes:",
      "The Moon is not cheese! It is rock and dust.",
      "Hi! Just kidding. Nobody has ever found life on Mars. But we are still looking!",
      "👽 A tiny flying saucer! Just kidding: nobody has ever found aliens. But we are still looking!",
      "🦆 A rubber duck, floating in space! With no air to stop it, anything you let go of keeps drifting.",
      "Scientists plan to build Mars homes underground to stay safe from space rays. Ours is up here so you can see it. We know, we know!",
      "Fun facts we have not linked to a source yet. We believe they are true, but they are here as curiosities:",
      "A robot here made oxygen out of Mars air. Astronauts need it to breathe!",
      "These rocks are round like marbles. Long ago a river rolled them. This crater was once a lake!",
      "True story: on Apollo 17 the crew fixed a broken rover fender with maps, tape and clamps.",
      "The Space Station's solar wings turn to follow the Sun, just like you did.",
      "Spacecraft are wrapped in shiny gold blankets to keep heat in. Curiosity measured a Mars night of −98 °C, colder than any freezer!",
    ], fontes: [{ nome: "Team choices: game design and story" }] },
    { id: "fatos-planetas", imagem: "lua/planetas/terra.png", titulo: "Planet cards", texto: [
      "The numbers on each planet card (size, day, year, distance, gravity) come from the NASA planetary fact sheets.",
      "The short facts come from the NASA Science page of each planet. Gravity is the value at the equator.",
    ], fontes: [{ nome: "NASA planetary fact sheets", url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/" }, { nome: "NASA: Sun facts", url: "https://science.nasa.gov/sun/facts/" }, { nome: "NASA: Mercury facts", url: "https://science.nasa.gov/mercury/facts/" }, { nome: "NASA: Venus facts", url: "https://science.nasa.gov/venus/venus-facts/" }, { nome: "NASA: Jupiter facts", url: "https://science.nasa.gov/jupiter/facts/" }, { nome: "NASA: Saturn facts", url: "https://science.nasa.gov/saturn/facts/" }, { nome: "NASA: Uranus facts", url: "https://science.nasa.gov/uranus/facts/" }, { nome: "NASA: Neptune facts", url: "https://science.nasa.gov/neptune/neptune-facts/" }] },
  ] },
];
