/**
 * Centralized Artwork Sizing, Gap & Layout Configuration (Our Museum 3D)
 * 
 * Modifying any value here updates all 6 salon rooms uniformly!
 * All measurements are in meters (Three.js world units).
 * 
 * export const DEFAULT_ARTWORK_SIZES = {
	// 1. East Wall - 5 Sequential Artworks
	eastWall: {
		count: 5,
		width: 1.70,
		height: 1.55,
		gap: 0.30,
		y: 2.05,
	},

	// 2. North Wall - Masterpiece Artwork (Centered above bench)
	northMasterpiece: {
		width: 4.50,
		height: 3.00,
		y: 2.40,
	},

	// 3. South Wall - Flanking Artworks (Left & Right of gate)
	southGateArtworks: {
		width: 3.00,
		height: 2.15,
		doorOffsetU: 3.20,
		y: 2.05,
	},

	// 4. Center Divider Partition - Highlight Artworks
	centerPartition: {
		width: 3.50,
		height: 2.50,
		y: 2.05,
	},

	// 5. West Wall - Autofilled Narrative Memory Text Board
	westNarrativeBoard: {
		width: 6.60,
		height: 3.00,
		y: 2.30,
	},

	// 6. Grand Lobby - South Wall Masterpiece
	lobbyMasterpiece: {
		width: 6.00,
		height: 2.85,
		y: 3.25,
	},
}
 */

export const DEFAULT_ARTWORK_SIZES = {
	// 1. East Wall - 5 Sequential Artworks
	eastWall: {
		count: 5,
		width: 1.70,
		height: 1.55,
		gap: 0.30,
		y: 2.05,
	},

	// 2. North Wall - Masterpiece Artwork (Centered above bench)
	northMasterpiece: {
		width: 4.50,
		height: 3.00,
		y: 2.40,
	},

	// 3. South Wall - Flanking Artworks (Left & Right of gate)
	southGateArtworks: {
		width: 3.00,
		height: 2.15,
		doorOffsetU: 3.20,
		y: 2.05,
	},

	// 4. Center Divider Partition - Highlight Artworks
	centerPartition: {
		width: 3.50,
		height: 2.50,
		y: 2.05,
	},

	// 5. West Wall - Autofilled Narrative Memory Text Board
	westNarrativeBoard: {
		width: 6.60,
		height: 3.00,
		y: 2.30,
	},

	// 6. Grand Lobby - South Wall Masterpiece
	lobbyMasterpiece: {
		width: 6.00,
		height: 2.85,
		y: 3.25,
	},
}

const STORAGE_KEY = 'ourmuseum:artworkSizes:v2'

/**
 * Returns active artwork sizes, merging local modifications with defaults.
 */
export function getArtworkSizes() {
	if (typeof window === 'undefined') return { ...DEFAULT_ARTWORK_SIZES }
	try {
		const saved = localStorage.getItem(STORAGE_KEY)
		if (saved) {
			const parsed = JSON.parse(saved)
			return {
				eastWall: { ...DEFAULT_ARTWORK_SIZES.eastWall, ...parsed.eastWall },
				northMasterpiece: { ...DEFAULT_ARTWORK_SIZES.northMasterpiece, ...parsed.northMasterpiece },
				southGateArtworks: { ...DEFAULT_ARTWORK_SIZES.southGateArtworks, ...parsed.southGateArtworks },
				centerPartition: { ...DEFAULT_ARTWORK_SIZES.centerPartition, ...parsed.centerPartition },
				westNarrativeBoard: { ...DEFAULT_ARTWORK_SIZES.westNarrativeBoard, ...parsed.westNarrativeBoard },
				lobbyMasterpiece: { ...DEFAULT_ARTWORK_SIZES.lobbyMasterpiece, ...parsed.lobbyMasterpiece },
			}
		}
	} catch (e) {
		console.warn('[OurMuseum] Failed to load saved artwork sizes', e)
	}
	return {
		eastWall: { ...DEFAULT_ARTWORK_SIZES.eastWall },
		northMasterpiece: { ...DEFAULT_ARTWORK_SIZES.northMasterpiece },
		southGateArtworks: { ...DEFAULT_ARTWORK_SIZES.southGateArtworks },
		centerPartition: { ...DEFAULT_ARTWORK_SIZES.centerPartition },
		westNarrativeBoard: { ...DEFAULT_ARTWORK_SIZES.westNarrativeBoard },
		lobbyMasterpiece: { ...DEFAULT_ARTWORK_SIZES.lobbyMasterpiece },
	}
}

/**
 * Saves modified artwork sizes to localStorage for live persistence.
 */
export function saveArtworkSizes(newSizes) {
	if (typeof window === 'undefined') return
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(newSizes))
	} catch (e) {
		console.warn('[OurMuseum] Failed to save artwork sizes', e)
	}
}

/**
 * Resets sizes back to factory default measurements.
 */
export function resetArtworkSizes() {
	if (typeof window === 'undefined') return { ...DEFAULT_ARTWORK_SIZES }
	try {
		localStorage.removeItem(STORAGE_KEY)
	} catch (e) {
		console.warn('[OurMuseum] Failed to reset artwork sizes', e)
	}
	return {
		eastWall: { ...DEFAULT_ARTWORK_SIZES.eastWall },
		northMasterpiece: { ...DEFAULT_ARTWORK_SIZES.northMasterpiece },
		southGateArtworks: { ...DEFAULT_ARTWORK_SIZES.southGateArtworks },
		centerPartition: { ...DEFAULT_ARTWORK_SIZES.centerPartition },
		westNarrativeBoard: { ...DEFAULT_ARTWORK_SIZES.westNarrativeBoard },
		lobbyMasterpiece: { ...DEFAULT_ARTWORK_SIZES.lobbyMasterpiece },
	}
}
