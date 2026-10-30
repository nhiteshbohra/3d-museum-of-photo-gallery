/**
 * Master 40 Exhibition Artworks Configuration
 * Distributed seamlessly across the 7 Boutique Salons of the Grand Art Pavilion
 */

export const gallery40Items = [
  // =========================================================================
  // SALON 1: THE GRAND ROTUNDA (5 Artworks)
  // High coffered dome, central skylight, dedication centerpiece
  // =========================================================================
  {
    id: 1,
    title: "For Maya: The Centerpiece",
    tag: "A PERMANENT COLLECTION",
    quote: "Our whole story, hung on the walls of this little world, just for you.",
    sign: "Love, Ethan",
    url: null,
    room: "Grand Rotunda",
    pos: [0.0, 2.3, -1.85],
    rot: [0, 0, 0],
    width: 3.2, height: 2.0, isCenterpiece: true
  },
  {
    id: 2,
    title: "The Snowy Whispers",
    tag: "WINTER MEMORIES",
    quote: "You said you hated the cold, but you stayed outside with me anyway.",
    sign: "Love, Ethan",
    url: null,
    room: "Grand Rotunda",
    pos: [-3.8, 2.1, 1.2],
    rot: [0, Math.PI / 2, 0],
    width: 1.6, height: 1.8
  },
  {
    id: 3,
    title: "Quiet Bench by the Pines",
    tag: "WINTER MEMORIES",
    quote: "The quiet moments we shared while the world stood completely still.",
    sign: "Love, Ethan",
    url: null,
    room: "Grand Rotunda",
    pos: [3.8, 2.1, 1.2],
    rot: [0, -Math.PI / 2, 0],
    width: 1.6, height: 1.8
  },
  {
    id: 4,
    title: "Snowy Trails With You",
    tag: "JOURNEY",
    quote: "Every single path I walk, I want to walk with you.",
    sign: "Love, Ethan",
    url: null,
    room: "Grand Rotunda",
    pos: [-2.2, 2.1, 4.35],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.8
  },
  {
    id: 5,
    title: "Forever Beside You",
    tag: "ETERNAL",
    quote: "When time completely stopped and nothing else in this universe mattered.",
    sign: "Love, Ethan",
    url: null,
    room: "Grand Rotunda",
    pos: [2.2, 2.1, 4.35],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.8
  },

  // =========================================================================
  // SALON 2: FIRESIDE WINTER SALON (6 Artworks)
  // Marble fireplace, plush sectional sofa, warm wool rug, 2400K hearth
  // =========================================================================
  {
    id: 6,
    title: "Warm Hearth With You",
    tag: "FIRESIDE SALON",
    quote: "The cozy glow of our fireplace while the cold night winds blew outside.",
    sign: "Love, Ethan",
    url: null,
    room: "Fireside Salon",
    pos: [-8.5, 2.6, -1.85],
    rot: [0, 0, 0],
    width: 2.2, height: 1.4
  },
  {
    id: 7,
    title: "Sparks in the Dark",
    tag: "FIRESIDE SALON",
    quote: "Watching glowing embers rise into the chimney while you held my hand.",
    sign: "Love, Ethan",
    url: null,
    room: "Fireside Salon",
    pos: [-12.2, 2.1, -1.85],
    rot: [0, 0, 0],
    width: 1.6, height: 1.6
  },
  {
    id: 8,
    title: "Midnight Cocoa",
    tag: "FIRESIDE SALON",
    quote: "Two mugs, steam rising, and no rush to be anywhere else in the world.",
    sign: "Love, Ethan",
    url: null,
    room: "Fireside Salon",
    pos: [-5.2, 2.1, -1.85],
    rot: [0, 0, 0],
    width: 1.6, height: 1.6
  },
  {
    id: 9,
    title: "Whispers by the Mantle",
    tag: "FIRESIDE SALON",
    quote: "All our little private jokes that only make sense when we are together.",
    sign: "Love, Ethan",
    url: null,
    room: "Fireside Salon",
    pos: [-13.35, 2.1, 1.0],
    rot: [0, Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },
  {
    id: 10,
    title: "The Woolen Blanket",
    tag: "FIRESIDE SALON",
    quote: "Tucked away together, safe from whatever storm was brewing outside.",
    sign: "Love, Ethan",
    url: null,
    room: "Fireside Salon",
    pos: [-13.35, 2.1, 3.8],
    rot: [0, Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },
  {
    id: 11,
    title: "Soft Embers at 2 AM",
    tag: "FIRESIDE SALON",
    quote: "When everyone else was asleep, the whole quiet world was just ours.",
    sign: "Love, Ethan",
    url: null,
    room: "Fireside Salon",
    pos: [-8.5, 2.1, 5.35],
    rot: [0, Math.PI, 0],
    width: 2.0, height: 1.5
  },

  // =========================================================================
  // SALON 3: MUSIC CONSERVATORY (6 Artworks)
  // Grand piano, acoustic walnut panels, brass music sconces
  // =========================================================================
  {
    id: 12,
    title: "Melody in the Evening",
    tag: "MUSIC CONSERVATORY",
    quote: "Every romantic note played on the piano reminds me of your smile.",
    sign: "Love, Ethan",
    url: null,
    room: "Music Conservatory",
    pos: [8.5, 2.3, -1.85],
    rot: [0, 0, 0],
    width: 2.2, height: 1.5
  },
  {
    id: 13,
    title: "The Waltz We Shared",
    tag: "MUSIC CONSERVATORY",
    quote: "Dancing barefoot across the room without needing any orchestra.",
    sign: "Love, Ethan",
    url: null,
    room: "Music Conservatory",
    pos: [12.2, 2.1, -1.85],
    rot: [0, 0, 0],
    width: 1.6, height: 1.6
  },
  {
    id: 14,
    title: "Harmony in Ivory",
    tag: "MUSIC CONSERVATORY",
    quote: "Two different lives tuned together into one effortless harmony.",
    sign: "Love, Ethan",
    url: null,
    room: "Music Conservatory",
    pos: [5.2, 2.1, -1.85],
    rot: [0, 0, 0],
    width: 1.6, height: 1.6
  },
  {
    id: 15,
    title: "Crescendo of Laughter",
    tag: "MUSIC CONSERVATORY",
    quote: "That uncontrollable laughter of yours is my favorite song ever written.",
    sign: "Love, Ethan",
    url: null,
    room: "Music Conservatory",
    pos: [13.35, 2.1, 1.0],
    rot: [0, -Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },
  {
    id: 16,
    title: "Serenade Under the Chandelier",
    tag: "MUSIC CONSERVATORY",
    quote: "Looking across the room and knowing I will love you for the rest of my days.",
    sign: "Love, Ethan",
    url: null,
    room: "Music Conservatory",
    pos: [13.35, 2.1, 3.8],
    rot: [0, -Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },
  {
    id: 17,
    title: "The Unwritten Encore",
    tag: "MUSIC CONSERVATORY",
    quote: "Every movement of our lives together is better than the last.",
    sign: "Love, Ethan",
    url: null,
    room: "Music Conservatory",
    pos: [8.5, 2.1, 5.35],
    rot: [0, Math.PI, 0],
    width: 2.0, height: 1.5
  },

  // =========================================================================
  // SALON 4: LIBRARY READING NOOK (4 Artworks)
  // Built-in millwork bookshelves, reading armchair, warm brass lamps
  // =========================================================================
  {
    id: 18,
    title: "Our Next Chapter",
    tag: "LIBRARY NOOK",
    quote: "All the dreams, plans, and adventures we are writing together.",
    sign: "Love, Ethan",
    url: null,
    room: "Library Nook",
    pos: [-13.35, 2.1, -6.5],
    rot: [0, Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },
  {
    id: 19,
    title: "Pressed Petals in Old Books",
    tag: "LIBRARY NOOK",
    quote: "Little tokens saved from every quiet Sunday we spent doing nothing at all.",
    sign: "Love, Ethan",
    url: null,
    room: "Library Nook",
    pos: [-11.0, 2.1, -9.85],
    rot: [0, 0, 0],
    width: 1.7, height: 1.5
  },
  {
    id: 20,
    title: "Coffee & Literature",
    tag: "LIBRARY NOOK",
    quote: "Reading side-by-side in total silence, the deepest comfort I know.",
    sign: "Love, Ethan",
    url: null,
    room: "Library Nook",
    pos: [-7.0, 2.1, -9.85],
    rot: [0, 0, 0],
    width: 1.7, height: 1.5
  },
  {
    id: 21,
    title: "Words Left Unsaid",
    tag: "LIBRARY NOOK",
    quote: "The simple glance that says everything without speaking a single word.",
    sign: "Love, Ethan",
    url: null,
    room: "Library Nook",
    pos: [-5.15, 2.1, -6.5],
    rot: [0, -Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },

  // =========================================================================
  // SALON 5: MONOLITH SCULPTURE HALL (8 Artworks)
  // 3 Freestanding double-sided marble pillars standing in open hall
  // Visitors can walk completely around them
  // =========================================================================
  // Monolith 1 (South): Front & Back
  {
    id: 22,
    title: "The Golden Horizon (South A)",
    tag: "MONOLITH HALL",
    quote: "Standing on the cliff edge watching the sunset turn the sky to bronze.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [7.5, 2.1, -4.5],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.6
  },
  {
    id: 23,
    title: "First Light (South B)",
    tag: "MONOLITH HALL",
    quote: "The morning light breaking through the curtains on our first vacation.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [7.5, 2.1, -4.75],
    rot: [0, 0, 0],
    width: 1.6, height: 1.6
  },
  // Monolith 2 (Center): Front & Back
  {
    id: 24,
    title: "Sculpted by Time (Center A)",
    tag: "MONOLITH HALL",
    quote: "The way our lives grew naturally into one another.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [10.5, 2.1, -6.8],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.6
  },
  {
    id: 25,
    title: "Reflections in Marble (Center B)",
    tag: "MONOLITH HALL",
    quote: "Seeing the person I always wanted to become whenever you look at me.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [10.5, 2.1, -7.05],
    rot: [0, 0, 0],
    width: 1.6, height: 1.6
  },
  // Monolith 3 (North): Front & Back
  {
    id: 26,
    title: "The Endless Coast (North A)",
    tag: "MONOLITH HALL",
    quote: "Salt in the air, wind in your hair, and endless road ahead.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [7.5, 2.1, -9.2],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.6
  },
  {
    id: 27,
    title: "Tides & Stars (North B)",
    tag: "MONOLITH HALL",
    quote: "Listening to the waves crash gently in the dark beside you.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [7.5, 2.1, -9.45],
    rot: [0, 0, 0],
    width: 1.6, height: 1.6
  },
  // Monolith Gallery Outer Walls
  {
    id: 28,
    title: "Monolith West Niche",
    tag: "MONOLITH HALL",
    quote: "A quiet alcove between the marble pillars.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [5.15, 2.1, -7.0],
    rot: [0, Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },
  {
    id: 29,
    title: "Monolith East Vista",
    tag: "MONOLITH HALL",
    quote: "Framing the eastern horizon and all our open horizons.",
    sign: "Love, Ethan",
    url: null,
    room: "Monolith Hall",
    pos: [13.35, 2.1, -7.0],
    rot: [0, -Math.PI / 2, 0],
    width: 1.8, height: 1.6
  },

  // =========================================================================
  // SALON 6: STARLIGHT GLASS ORANGERY (6 Artworks)
  // Floor-to-ceiling panoramic glass, indoor botanical plants, garden vista
  // =========================================================================
  {
    id: 30,
    title: "Under the Midnight Sky",
    tag: "STARLIGHT ORANGERY",
    quote: "Standing under the stars together, breathing in the quiet night air.",
    sign: "Love, Ethan",
    url: null,
    room: "Glass Orangery",
    pos: [-2.8, 2.2, -12.35],
    rot: [0, 0, 0],
    width: 1.9, height: 1.5
  },
  {
    id: 31,
    title: "The Pine Canopy",
    tag: "STARLIGHT ORANGERY",
    quote: "Walking beneath the tall evergreen pines, holding your warm jacket.",
    sign: "Love, Ethan",
    url: null,
    room: "Glass Orangery",
    pos: [2.8, 2.2, -12.35],
    rot: [0, 0, 0],
    width: 1.9, height: 1.5
  },
  {
    id: 32,
    title: "Moonbeams on Glass",
    tag: "STARLIGHT ORANGERY",
    quote: "Soft silver moonlight streaming down across the conservatory tiles.",
    sign: "Love, Ethan",
    url: null,
    room: "Glass Orangery",
    pos: [-4.85, 2.1, -9.5],
    rot: [0, Math.PI / 2, 0],
    width: 1.7, height: 1.6
  },
  {
    id: 33,
    title: "Lush Evergreen",
    tag: "STARLIGHT ORANGERY",
    quote: "Love that stays alive, green, and vibrant through every single winter.",
    sign: "Love, Ethan",
    url: null,
    room: "Glass Orangery",
    pos: [4.85, 2.1, -9.5],
    rot: [0, -Math.PI / 2, 0],
    width: 1.7, height: 1.6
  },
  {
    id: 34,
    title: "Constellations Above Us",
    tag: "STARLIGHT ORANGERY",
    quote: "Finding the little dipper and imagining all the years ahead of us.",
    sign: "Love, Ethan",
    url: null,
    room: "Glass Orangery",
    pos: [-2.2, 2.1, -6.85],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.5
  },
  {
    id: 35,
    title: "Morning Dew on the Ferns",
    tag: "STARLIGHT ORANGERY",
    quote: "The quiet fresh dawn that promises another day with you.",
    sign: "Love, Ethan",
    url: null,
    room: "Glass Orangery",
    pos: [2.2, 2.1, -6.85],
    rot: [0, Math.PI, 0],
    width: 1.6, height: 1.5
  },

  // =========================================================================
  // SALON 7: THE PROMISE ALCOVE (5 Artworks)
  // Intimate circular plaster archway, warm ambient glow, couple's velvet bench
  // =========================================================================
  {
    id: 36,
    title: "The Promise",
    tag: "THE PROMISE ALCOVE",
    quote: "To choose you, honor you, and cherish you through every season.",
    sign: "Love, Ethan",
    url: null,
    room: "Promise Alcove",
    pos: [0.0, 2.3, -13.35],
    rot: [0, 0, 0],
    width: 2.2, height: 1.6
  },
  {
    id: 37,
    title: "Hand in Hand",
    tag: "THE PROMISE ALCOVE",
    quote: "Our fingers intertwined, fitting together like they were sculpted for it.",
    sign: "Love, Ethan",
    url: null,
    room: "Promise Alcove",
    pos: [-1.85, 2.1, -12.5],
    rot: [0, Math.PI / 4, 0],
    width: 1.5, height: 1.6
  },
  {
    id: 38,
    title: "A Vow for Tomorrow",
    tag: "THE PROMISE ALCOVE",
    quote: "Not just for today, but for every ordinary Tuesday fifty years from now.",
    sign: "Love, Ethan",
    url: null,
    room: "Promise Alcove",
    pos: [1.85, 2.1, -12.5],
    rot: [0, -Math.PI / 4, 0],
    width: 1.5, height: 1.6
  },
  {
    id: 39,
    title: "The Ring & The Smile",
    tag: "THE PROMISE ALCOVE",
    quote: "The tears in your eyes when you said the easiest yes of your life.",
    sign: "Love, Ethan",
    url: null,
    room: "Promise Alcove",
    pos: [-1.4, 2.1, -14.15],
    rot: [0, Math.PI / 2, 0],
    width: 1.4, height: 1.5
  },
  {
    id: 40,
    title: "Our Forever Home",
    tag: "THE PROMISE ALCOVE",
    quote: "Wherever you are in this world, that is where my home will always be.",
    sign: "Love, Ethan",
    url: null,
    room: "Promise Alcove",
    pos: [1.4, 2.1, -14.15],
    rot: [0, -Math.PI / 2, 0],
    width: 1.4, height: 1.5
  }
];

