// Couple Museum Salons and Artwork Data (Our Museum 3D - Crafted by Hitesh Bohra)

// All salon photo assets are loaded from /photos/<room_folder>/.
const IDENTICAL_PHOTOS = []

export const coupleSalons = {
  'Fireside Winter Memories': {
    title: 'Fireside Winter Memories',
    extract: 'Warm hearths, snowy pines, and quiet evenings where the outside world faded away into embers and candlelight.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Music & Classical Melodies', 'The Library & Reading Nook', 'Masterpiece Paris Romance', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'Music & Classical Melodies': {
    title: 'Music & Classical Melodies',
    extract: 'Chopin nocturnes on the grand piano, acoustic acoustics, and the songs that became the soundtrack to our life.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'The Library & Reading Nook', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'The Library & Reading Nook': {
    title: 'The Library & Reading Nook',
    extract: 'Floor-to-ceiling walnut bookcases, quiet afternoon sunlight, and the stories we shared over warm coffee.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'Masterpiece Paris Romance', 'The Secret Promise Alcove']
  },

  'Masterpiece Paris Romance': {
    title: 'Masterpiece Paris Romance',
    extract: 'The lights along the Seine, the steps of Montmartre, and holding hands under the midnight rain.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'The Glass Orangery', 'The Secret Promise Alcove']
  },

  'The Glass Orangery': {
    title: 'The Glass Orangery',
    extract: 'Lush architectural palms, starlit glass skylights, and fragrant botanical warmth against the winter chill.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'Music & Classical Melodies', 'The Secret Promise Alcove']
  },

  'The Secret Promise Alcove': {
    title: 'The Secret Promise Alcove',
    extract: 'Hidden behind the revolving library bookcase. A private sanctuary built for two hearts.',
    longExtract: '✦ Present your private invitation pass to reveal Ethan and Maya\'s personal letter for this salon ✦',
    mainThumbnailUrl: null,
    photos: IDENTICAL_PHOTOS,
    seeAlso: ['Fireside Winter Memories', 'Masterpiece Paris Romance', 'The Glass Orangery']
  }
};

export const coupleCategories = [
  'Fireside Winter Memories',
  'Music & Classical Melodies',
  'The Library & Reading Nook',
  'Masterpiece Paris Romance',
  'The Glass Orangery',
  'The Secret Promise Alcove'
];

export const ROOM_KEY_TO_TITLE = {
  fireside: 'Fireside Winter Memories',
  music: 'Music & Classical Melodies',
  library: 'The Library & Reading Nook',
  paris: 'Masterpiece Paris Romance',
  orangery: 'The Glass Orangery',
  alcove: 'The Secret Promise Alcove',
};
