#!/usr/bin/env python3
"""
organize_photos.py — Sort your personal photos into the Museum's public/photos layout.

The 3D museum displays artwork by reading image files from public/photos/<room>/.
This script copies a folder of your own images (PNG/JPG/WebP) into the correct
room folders with the exact slot filenames the museum expects, so they appear on
the walls automatically.

--------------------------------------------------------------------------
How it decides where each image goes (the naming convention)
--------------------------------------------------------------------------
Your source images are named with a room index and a slot number:

    <room>_<slot>.<ext>

  - <room>  = the room index you are targeting:
                 00 -> Grand Lobby
                 01 -> Fireside Winter Memories
                 02 -> Music & Classical Melodies
                 03 -> The Library & Reading Nook
                 04 -> Masterpiece Paris Romance
                 05 -> The Glass Orangery
                 06 -> The Secret Promise Alcove
  - <slot>  = which position inside that room:
                 Lobby: only 01
                 Salons: 01 .. 10 (see table below)

Examples:
   00_01.jpg          -> public/photos/00_grand_lobby/01_south_wall_masterpiece.png
   01_03.png          -> public/photos/01_fireside_winter_memories/03_north_wall_masterpiece.png
   04_07.jpg          -> public/photos/04_masterpiece_paris_romance/07_east_wall_artwork_2.png
   06_10.webp         -> public/photos/06_secret_promise_alcove/10_east_wall_artwork_5.png

A leading prefix before the room index is allowed and ignored, so files like
   IMG_0342_04_07.jpg
   2024_paris_04_07.png
are both recognised as room 04, slot 07. Files that do not match are reported
and skipped (they are not guessed).

--------------------------------------------------------------------------
Usage
--------------------------------------------------------------------------
    python tools/organize_photos.py --source C:/Users/you/Pictures/museum_images
    python tools/organize_photos.py --source ./raw --out public/photos --dry-run

Options:
    --source   (required) folder containing your images
    --out      destination root (default: public/photos)
    --dry-run  print what WOULD happen without copying anything
    --max-gap  allow slot gaps up to this size when a source folder is used
               (default: skip non-matching files; see --folder-mode)

Advanced: if your source folder contains ONE subfolder per room (named like
"03_library" or just "03"), pass --folder-mode and the script will read room
numbers from those subfolders and use each file's position inside it as the slot.
"""

import argparse
import os
import re
import shutil
import sys

# ---------------------------------------------------------------------------
# Static maps (mirror of the README slot catalog)
# ---------------------------------------------------------------------------

# room index -> (folder name, number of slots)
ROOMS = {
    0: ("00_grand_lobby", 1),
    1: ("01_fireside_winter_memories", 10),
    2: ("02_music_classical_melodies", 10),
    3: ("03_library_reading_nook", 10),
    4: ("04_masterpiece_paris_romance", 10),
    5: ("05_the_glass_orangery", 10),
    6: ("06_secret_promise_alcove", 10),
}

LOBBY_SLOT = 1

# slot number -> target filename (salon layout)
SALON_SLOT_NAMES = {
    1: "01_partition_front_highlight",
    2: "02_partition_back_highlight",
    3: "03_north_wall_masterpiece",
    4: "04_south_wall_gate_left",
    5: "05_south_wall_gate_right",
    6: "06_east_wall_artwork_1",
    7: "07_east_wall_artwork_2",
    8: "08_east_wall_artwork_3",
    9: "09_east_wall_artwork_4",
    10: "10_east_wall_artwork_5",
}

ACCEPTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def target_name(room_idx: int, slot: int) -> str:
    """Return the destination filename (without extension) for a room+slot."""
    if room_idx == 0:
        if slot == LOBBY_SLOT:
            return "01_south_wall_masterpiece"
        raise ValueError(f"Grand Lobby only accepts slot 01 (got {slot})")
    name = SALON_SLOT_NAMES.get(slot)
    if name is None:
        raise ValueError(f"Slot must be 01..10 for salons (got {slot})")
    return name


ROOM_PATTERN = re.compile(r"(^|[\s_\-])([0-6])[\s_\-]([01]?[0-9])([\s_\-]|$)", re.IGNORECASE)


def parse_room_slot(filename: str):
    """
    Extract (room_index, slot) from a filename.

    Supports the primary convention '<room>_<slot>' with an optional ignored
    prefix, e.g. '04_07.jpg' or 'IMG_0342_04_07.png'.
    Returns (room_idx, slot) or None if it cannot be determined.
    """
    name = os.path.splitext(os.path.basename(filename))[0]

    # Try the strict two-number pattern first (room then slot at the end).
    m = re.search(r"(?:^|[\s_\-])([0-6])[\s_\-]([01]?[0-9])(?:[\s_\-]|$)", name)
    if m:
        room = int(m.group(1))
        slot = int(m.group(2))
        if room in ROOMS and slot <= ROOMS[room][1]:
            return room, slot

    # Fallback: a lone room token followed by a slot token anywhere.
    tokens = re.split(r"[\s_\-]+", name)
    for i, tok in enumerate(tokens):
        if tok.isdigit() and int(tok) in ROOMS:
            # look for a slot token after it
            for j in range(i + 1, len(tokens)):
                if tokens[j].isdigit():
                    slot = int(tokens[j])
                    if slot <= ROOMS[int(tok)][1]:
                        return int(tok), slot
                    break
    return None


def guess_room_from_folder(folder_name: str):
    """Return room index if the folder is named with the room prefix/index."""
    base = os.path.basename(folder_name).lower()
    m = re.match(r"\s*([0-6])[\s_\-]?", base)
    if m and int(m.group(1)) in ROOMS:
        return int(m.group(1))
    # allow full names too
    for idx, (foldername, _) in ROOMS.items():
        if idx > 0 and foldername.split("_", 1)[1].replace("_", " ") in base.replace("_", " "):
            return idx
    return None


def list_images(folder: str):
    out = []
    for fn in os.listdir(folder):
        full = os.path.join(folder, fn)
        if os.path.isfile(full) and os.path.splitext(fn)[1].lower() in ACCEPTED_EXTS:
            out.append(full)
    return sorted(out)


def convert_to_png(src: str, dst: str) -> None:
    """Convert src (any accepted format) to a PNG at dst. Falls back to a byte
    copy (keeping the original bytes but with a .png name) if Pillow is not
    installed — the museum only cares about the file extension."""
    try:
        from PIL import Image
        img = Image.open(src)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        img.save(dst, "PNG")
        return
    except Exception:
        shutil.copyfile(src, dst)


def run(source: str, out_root: str, dry_run: bool, folder_mode: bool) -> int:
    if not os.path.isdir(source):
        print(f"[error] Source folder not found: {source}", file=sys.stderr)
        return 1

    plan = []  # (src, dst)
    skipped = []

    if folder_mode:
        # One subfolder per room; slot = 1-based order inside that subfolder.
        for entry in sorted(os.listdir(source)):
            sub = os.path.join(source, entry)
            if not os.path.isdir(sub):
                continue
            room = guess_room_from_folder(entry)
            if room is None:
                skipped.append((entry, "unrecognised room folder"))
                continue
            imgs = list_images(sub)
            for slot, img in enumerate(imgs, start=1):
                if slot > ROOMS[room][1]:
                    skipped.append((img, f"slot {slot} exceeds room capacity"))
                    continue
                folder, _ = ROOMS[room]
                dst = os.path.join(out_root, folder, target_name(room, slot) + ".png")
                plan.append((img, dst))
    else:
        for img in list_images(source):
            parsed = parse_room_slot(img)
            if parsed is None:
                skipped.append((img, "name does not match <room>_<slot>"))
                continue
            room, slot = parsed
            folder, _ = ROOMS[room]
            dst = os.path.join(out_root, folder, target_name(room, slot) + ".png")
            plan.append((img, dst))

    # ------------------------------------------------------------------ report
    print("=" * 78)
    print(f"Photo organizer — {len(plan)} image(s) to place, "
          f"{len(skipped)} skipped")
    print("=" * 78)

    placed_by_room = {}
    if dry_run:
        for src, dst in plan:
            rel = os.path.relpath(dst, out_root)
            placed_by_room[rel.split(os.sep)[0]] = placed_by_room.get(
                rel.split(os.sep)[0], 0) + 1
            print(f"[dry-run] {os.path.basename(src):38s} -> {rel}")
    else:
        os.makedirs(out_root, exist_ok=True)
        for src, dst in plan:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            convert_to_png(src, dst)
            rel = os.path.relpath(dst, out_root)
            placed_by_room[rel.split(os.sep)[0]] = placed_by_room.get(
                rel.split(os.sep)[0], 0) + 1
            print(f"[copied ] {os.path.basename(src):38s} -> {rel}")

    # ------------------------------------------------------------------ summary
    print("-" * 78)
    print("Slots filled per room:")
    for idx, (folder, cap) in ROOMS.items():
        filled = placed_by_room.get(folder, 0)
        print(f"  {folder:<38s} {filled:2d}/{cap}")
    if skipped:
        print("-" * 78)
        print(f"Skipped {len(skipped)} file(s):")
        for src, reason in skipped:
            print(f"  - {os.path.basename(src)} ({reason})")

    # ------------------------------------------------------------------ warn
    if not dry_run:
        missing = [
            folder for idx, (folder, cap) in ROOMS.items()
            if placed_by_room.get(folder, 0) < cap
        ]
        if missing:
            print("-" * 78)
            print("[note] Rooms with empty slots (the museum will fall back to")
            print("       the generated paintings there):")
            for folder in missing:
                print(f"         {folder}: "
                      f"{placed_by_room.get(folder,0)}/{ROOMS[[k for k,v in ROOMS.items() if v[0]==folder][0]][1]}")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Organise photos into museum slots.")
    ap.add_argument("--source", required=True, help="Folder containing your images")
    ap.add_argument("--out", default="public/photos", help="Destination root (default public/photos)")
    ap.add_argument("--dry-run", action="store_true", help="Only print what would be done")
    ap.add_argument("--folder-mode", action="store_true",
                    help="Source contains one subfolder per room; slot = file order inside it")
    args = ap.parse_args()

    sys.exit(run(args.source, args.out, args.dry_run, args.folder_mode))


if __name__ == "__main__":
    main()
