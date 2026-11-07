# 🏛️ Our Museum 3D — Complete Photo Slots Catalog & Replacement Guide

This folder contains all **75 photos** displayed across the entire 3D Museum (3 Grand Lobby artworks + 72 salon artworks across 6 salons).

---

## 📊 Summary of Total Photos Required

| Location | Room Name | Photo Count | Slot IDs / File Names |
|---|---|:---:|---|
| **Grand Lobby** | Ground Floor South Wall | **3** | `01_south_wall_masterpiece.png`, `02_south_wall_companion_left.png`, `03_south_wall_companion_right.png` |
| **Salon 1** | Fireside Winter Memories | **12** | `01_partition_front_highlight` through `12_partition_back_companion` |
| **Salon 2** | Music & Classical Melodies | **12** | `01_partition_front_highlight` through `12_partition_back_companion` |
| **Salon 3** | The Library & Reading Nook | **12** | `01_partition_front_highlight` through `12_partition_back_companion` |
| **Salon 4** | Masterpiece Paris Romance | **12** | `01_partition_front_highlight` through `12_partition_back_companion` |
| **Salon 5** | The Glass Orangery | **12** | `01_partition_front_highlight` through `12_partition_back_companion` |
| **Salon 6** | The Secret Promise Alcove | **12** | `01_partition_front_highlight` through `12_partition_back_companion` |
| **TOTAL** | **Entire Museum Collection** | **75** | **All unique positions** |

---

## 📁 Directory Structure & File Map

```text
photos/
├── 00_grand_lobby/
│   ├── 01_south_wall_masterpiece.png           [3.4m × 2.0m] (Centerpiece South Wall landscape above credenza)
│   ├── 02_south_wall_companion_left.png        [1.25m × 1.6m] (Flanking South Wall left companion artwork)
│   └── 03_south_wall_companion_right.png       [1.25m × 1.6m] (Flanking South Wall right companion artwork)
│
├── 01_fireside_winter_memories/
│   ├── 01_partition_front_highlight.png        [1.35m × 2.1m] (Center divider front face diptych, left portrait)
│   ├── 02_partition_back_highlight.png         [1.35m × 2.1m] (Center divider back face diptych, left portrait)
│   ├── 03_north_wall_masterpiece.png           [2.6m × 1.6m] (Large centerpiece above plinth / gallery display)
│   ├── 04_south_wall_gate_left.png             [1.55m × 1.10m] (Left side of entrance door)
│   ├── 05_south_wall_gate_right.png            [1.55m × 1.10m] (Right side of entrance door)
│   ├── 06_east_wall_artwork_1.png              [1.55m × 1.12m] (East Wall gallery, position 1)
│   ├── 07_east_wall_artwork_2.png              [1.55m × 1.12m] (East Wall gallery, position 2)
│   ├── 08_east_wall_artwork_3.png              [1.55m × 1.12m] (East Wall gallery, position 3 - center)
│   ├── 09_east_wall_artwork_4.png              [1.55m × 1.12m] (East Wall gallery, position 4)
│   ├── 10_east_wall_artwork_5.png              [1.55m × 1.12m] (East Wall gallery, position 5)
│   ├── 11_partition_front_companion.png        [1.35m × 2.1m] (Center divider front face diptych, right portrait)
│   └── 12_partition_back_companion.png         [1.35m × 2.1m] (Center divider back face diptych, right portrait)
│
├── 02_music_classical_melodies/                [12 photos, same layout]
├── 03_library_reading_nook/                    [12 photos, same layout]
├── 04_masterpiece_paris_romance/               [12 photos, same layout]
├── 05_the_glass_orangery/                      [12 photos, same layout]
└── 06_secret_promise_alcove/                   [12 photos, same layout]
```

---

## 🖼️ Recommended Image Specifications

- **Format**: `.png` or `.jpg` / `.webp`
- **Resolution**:
  * **Masterpieces & Partition Diptychs (Slots 01, 02, 03, 11, 12 & Lobby)**: `1920 × 1080` to `2560 × 1440` (high resolution recommended for enlarged Lightbox view).
  * **Wall Artworks (Slots 04 through 10)**: `1200 × 850` to `1600 × 1200`.
- **Aspect Ratio**:
  * Landscape (16:9, 3:2, or 4:3) and Portrait (for partition diptychs) work seamlessly. The 3D engine automatically fits any photo into physical gold frames without stretching or distortion.

---

## 🔄 How to Replace Photos

To replace any artwork in the museum with your personal photos:
1. Copy your image into the matching salon folder.
2. Rename your image to match the filename (e.g. replace `photos/01_fireside_winter_memories/03_north_wall_masterpiece.png` with your photo).
3. The 3D museum will automatically load and display your new image in real-time!

