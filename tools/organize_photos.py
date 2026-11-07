#!/usr/bin/env python3
"""
tools/organize_photos.py — Sort and place your personal photos into the 3D Museum.

The 3D museum displays artwork by reading image files from public/photos/<room>/.
This tool makes placing your photos effortless:
  1. Auto-Fill Mode (Zero Renaming Needed): Just drop your photos into a folder
     and let the tool place them sequentially into the museum frames!
  2. Room-Targeted Mode: Place a folder of photos into a specific room (e.g. Paris or Fireside).
  3. Single Image Placement: Place any image directly into a specific frame.
  4. Smart Auto-Match: Detects room numbers (01_03), room names (paris_2),
     or subfolder structures automatically.
  5. EXIF Auto-Rotation: Automatically rotates mobile phone photos right-side up.

Museum Layout (75 Total Photos):
  • 00_grand_lobby: 3 photos (Masterpiece, Left Companion, Right Companion)
  • 01_fireside_winter_memories: 12 photos (Diptychs, Masterpiece, Gates, East Gallery)
  • 02_music_classical_melodies: 12 photos
  • 03_library_reading_nook: 12 photos
  • 04_masterpiece_paris_romance: 12 photos
  • 05_the_glass_orangery: 12 photos
  • 06_secret_promise_alcove: 12 photos
"""

import argparse
import os
import re
import shutil
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Static Room & Slot Layout Maps
# ---------------------------------------------------------------------------

ROOMS = {
    0: ("00_grand_lobby", 3, "Grand Lobby"),
    1: ("01_fireside_winter_memories", 12, "Fireside Winter Memories"),
    2: ("02_music_classical_melodies", 12, "Music & Classical Melodies"),
    3: ("03_library_reading_nook", 12, "The Library & Reading Nook"),
    4: ("04_masterpiece_paris_romance", 12, "Masterpiece Paris Romance"),
    5: ("05_the_glass_orangery", 12, "The Glass Orangery"),
    6: ("06_secret_promise_alcove", 12, "The Secret Promise Alcove"),
}

# Grand Lobby (3 slots)
LOBBY_SLOT_INFO = {
    1: ("01_south_wall_masterpiece", "South Wall • Center Masterpiece"),
    2: ("02_south_wall_companion_left", "South Wall • Left Companion Frame"),
    3: ("03_south_wall_companion_right", "South Wall • Right Companion Frame"),
}

# Salons 01 through 06 (12 slots each)
SALON_SLOT_INFO = {
    1: ("01_partition_front_highlight", "Partition Wall • Front Left Diptych"),
    2: ("02_partition_back_highlight", "Partition Wall • Back Left Diptych"),
    3: ("03_north_wall_masterpiece", "North Wall • Masterpiece Frame"),
    4: ("04_south_wall_gate_left", "South Portal • Left Gate Frame"),
    5: ("05_south_wall_gate_right", "South Portal • Right Gate Frame"),
    6: ("06_east_wall_artwork_1", "East Wall • Frame 1 (Far North)"),
    7: ("07_east_wall_artwork_2", "East Wall • Frame 2 (North-Mid)"),
    8: ("08_east_wall_artwork_3", "East Wall • Frame 3 (Center)"),
    9: ("09_east_wall_artwork_4", "East Wall • Frame 4 (South-Mid)"),
    10: ("10_east_wall_artwork_5", "East Wall • Frame 5 (Far South)"),
    11: ("11_partition_front_companion", "Partition Wall • Front Right Diptych"),
    12: ("12_partition_back_companion", "Partition Wall • Back Right Diptych"),
}

# Legacy dictionaries for backwards compatibility
LOBBY_SLOT_NAMES = {k: v[0] for k, v in LOBBY_SLOT_INFO.items()}
SALON_SLOT_NAMES = {k: v[0] for k, v in SALON_SLOT_INFO.items()}

ROOM_ALIASES = {
    "0": 0, "00": 0, "lobby": 0, "grand_lobby": 0, "hall": 0,
    "1": 1, "01": 1, "fireside": 1, "winter": 1, "fireplace": 1,
    "2": 2, "02": 2, "music": 2, "melodies": 2, "melody": 2, "classical": 2, "piano": 2,
    "3": 3, "03": 3, "library": 3, "reading": 3, "nook": 3, "books": 3,
    "4": 4, "04": 4, "paris": 4, "romance": 4, "french": 4, "france": 4,
    "5": 5, "05": 5, "orangery": 5, "glass": 5, "garden": 5, "plants": 5,
    "6": 6, "06": 6, "alcove": 6, "secret": 6, "promise": 6,
}

ACCEPTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".bmp", ".tiff", ".heic"}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def target_name(room_idx: int, slot: int) -> str:
    """Return the destination filename (without extension) for a room+slot."""
    if room_idx == 0:
        info = LOBBY_SLOT_INFO.get(slot)
        if info is None:
            raise ValueError(f"Grand Lobby only accepts slots 1..3 (got {slot})")
        return info[0]
    info = SALON_SLOT_INFO.get(slot)
    if info is None:
        raise ValueError(f"Salon slots must be 1..12 (got {slot})")
    return info[0]


def slot_description(room_idx: int, slot: int) -> str:
    """Return human-readable wall and frame location."""
    if room_idx == 0:
        return LOBBY_SLOT_INFO.get(slot, ("", f"Slot {slot}"))[1]
    return SALON_SLOT_INFO.get(slot, ("", f"Slot {slot}"))[1]


def resolve_room(room_str: str | int | None) -> int | None:
    """Fuzzy resolve a room identifier (name, keyword, or number) to room index 0..6."""
    if room_str is None:
        return None
    s = str(room_str).strip().lower()
    if s in ROOM_ALIASES:
        return ROOM_ALIASES[s]
    for key, idx in ROOM_ALIASES.items():
        if key in s:
            return idx
    return None


def parse_room_slot(filename: str):
    """
    Extract (room_index, slot) from a filename.
    Supports:
      - '04_07.jpg', '01_12.png', 'IMG_123_02_05.jpg'
      - 'paris_03.jpg', 'fireside_11.png', 'lobby_2.jpg'
      - '03_masterpiece.jpg', 'paris_front_left.png'
    """
    base = os.path.splitext(os.path.basename(filename))[0].lower()

    # 1. Strict standard pattern: <room>_<slot>
    m = re.search(r"(?:^|[\s_\-])([0-6])[\s_\-]([01]?[0-9])(?:[\s_\-]|$)", base)
    if m:
        room = int(m.group(1))
        slot = int(m.group(2))
        max_slot = ROOMS[room][1]
        if 1 <= slot <= max_slot:
            return room, slot

    # 2. Named room followed by slot number: e.g. "paris_2", "fireside-03", "lobby_1"
    for alias, room in ROOM_ALIASES.items():
        m2 = re.search(rf"(?:^|[\s_\-]){re.escape(alias)}[\s_\-]([01]?[0-9])(?:[\s_\-]|$)", base)
        if m2:
            slot = int(m2.group(1))
            if 1 <= slot <= ROOMS[room][1]:
                return room, slot

    # 3. Named room with keyword slot:
    room_found = None
    for alias, r in ROOM_ALIASES.items():
        if re.search(rf"(?:^|[\s_\-]){re.escape(alias)}(?:[\s_\-]|$)", base):
            room_found = r
            break

    if room_found is not None:
        if room_found == 0:
            if "left" in base or "west" in base:
                return 0, 2
            if "right" in base or "east" in base:
                return 0, 3
            if "master" in base or "center" in base or "main" in base:
                return 0, 1
        else:
            if "front" in base and ("right" in base or "comp" in base or "2" in base):
                return room_found, 11
            if "front" in base:
                return room_found, 1
            if "back" in base and ("right" in base or "comp" in base or "2" in base):
                return room_found, 12
            if "back" in base:
                return room_found, 2
            if "master" in base or "north" in base:
                return room_found, 3
            if "gate" in base and "left" in base:
                return room_found, 4
            if "gate" in base and "right" in base:
                return room_found, 5

    return None


def guess_room_from_folder(folder_name: str) -> int | None:
    """Return room index if folder matches room name or number."""
    base = os.path.basename(folder_name).lower().strip()
    return resolve_room(base)


def list_images(folder: str) -> list[str]:
    """Return sorted list of image filepaths in folder."""
    if not os.path.isdir(folder):
        return []
    out = []
    for fn in os.listdir(folder):
        full = os.path.join(folder, fn)
        if os.path.isfile(full) and os.path.splitext(fn)[1].lower() in ACCEPTED_EXTS:
            out.append(full)
    return sorted(out)


def convert_to_png(src: str, dst: str) -> None:
    """
    Convert src to a PNG at dst with EXIF orientation correction.
    Falls back to a direct copy if Pillow is unavailable.
    """
    try:
        from PIL import Image, ImageOps
        with Image.open(src) as img:
            # Auto-rotate smartphone photos based on EXIF orientation tags
            img = ImageOps.exif_transpose(img)
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            img.save(dst, "PNG", optimize=True)
            return
    except Exception:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)


def get_all_slots_list() -> list[tuple[int, int]]:
    """Return all 75 slots in order: [(0, 1), (0, 2), ..., (6, 12)]."""
    slots = []
    for r in range(7):
        for s in range(1, ROOMS[r][1] + 1):
            slots.append((r, s))
    return slots


# ---------------------------------------------------------------------------
# Core Organizer Pipeline
# ---------------------------------------------------------------------------

def build_placement_plan(
    source: str,
    out_root: str,
    target_room: int | None = None,
    target_slot: int | None = None,
    single_image: str | None = None,
    folder_mode: bool = False,
    sequential: bool = False,
) -> tuple[list[tuple[str, str, int, int]], list[tuple[str, str]]]:
    """
    Build the list of (src, dst, room, slot) copies to perform.
    Returns (plan, skipped).
    """
    plan = []
    skipped = []

    # 1. Direct Single Image Placement
    if single_image:
        if not os.path.isfile(single_image):
            raise FileNotFoundError(f"Image file not found: {single_image}")
        r = target_room if target_room is not None else 0
        s = target_slot if target_slot is not None else 1
        folder = ROOMS[r][0]
        dst = os.path.join(out_root, folder, target_name(r, s) + ".png")
        plan.append((single_image, dst, r, s))
        return plan, skipped

    # 2. Subfolder mode: one subfolder per room
    if folder_mode:
        for entry in sorted(os.listdir(source)):
            sub = os.path.join(source, entry)
            if not os.path.isdir(sub):
                continue
            r = guess_room_from_folder(entry)
            if r is None:
                skipped.append((entry, "Folder name does not match any museum room"))
                continue
            imgs = list_images(sub)
            for slot_idx, img in enumerate(imgs, start=1):
                if slot_idx > ROOMS[r][1]:
                    skipped.append((img, f"Exceeds room capacity (max {ROOMS[r][1]} slots)"))
                    continue
                folder = ROOMS[r][0]
                dst = os.path.join(out_root, folder, target_name(r, slot_idx) + ".png")
                plan.append((img, dst, r, slot_idx))
        return plan, skipped

    images = list_images(source)
    if not images:
        return plan, skipped

    # 3. Room-Targeted Placement: fill a specific room from a folder of images
    if target_room is not None:
        start_slot = target_slot if target_slot is not None else 1
        max_slot = ROOMS[target_room][1]
        cur_slot = start_slot
        for img in images:
            if cur_slot > max_slot:
                skipped.append((img, f"Room '{ROOMS[target_room][2]}' is full ({max_slot}/{max_slot})"))
                continue
            folder = ROOMS[target_room][0]
            dst = os.path.join(out_root, folder, target_name(target_room, cur_slot) + ".png")
            plan.append((img, dst, target_room, cur_slot))
            cur_slot += 1
        return plan, skipped

    # 4. Smart Matching with Auto-Sequential Fallback
    unmatched = []
    claimed_slots = set()

    for img in images:
        parsed = parse_room_slot(img)
        if parsed is not None:
            r, s = parsed
            folder = ROOMS[r][0]
            dst = os.path.join(out_root, folder, target_name(r, s) + ".png")
            plan.append((img, dst, r, s))
            claimed_slots.add((r, s))
        else:
            unmatched.append(img)

    # If sequential mode requested OR all files are unmatched without room patterns
    if sequential or (unmatched and len(plan) == 0):
        # Auto-place sequentially into available slots
        all_slots = get_all_slots_list()
        avail_slots = [sl for sl in all_slots if sl not in claimed_slots]
        for img, (r, s) in zip(unmatched, avail_slots):
            folder = ROOMS[r][0]
            dst = os.path.join(out_root, folder, target_name(r, s) + ".png")
            plan.append((img, dst, r, s))
            claimed_slots.add((r, s))
        if len(unmatched) > len(avail_slots):
            for img in unmatched[len(avail_slots):]:
                skipped.append((img, "All 75 museum slots are full!"))
    else:
        for img in unmatched:
            skipped.append((img, "Filename does not specify <room>_<slot> (use --sequential to auto-fill)"))

    return plan, skipped


def execute_plan(plan: list[tuple[str, str, int, int]], skipped: list[tuple[str, str]], out_root: str, dry_run: bool = False) -> None:
    """Print report and copy files."""
    print("=" * 80)
    mode_str = "[DRY-RUN PREVIEW]" if dry_run else "[APPLYING CHANGES]"
    print(f"  🏛️  3D MUSEUM PHOTO ORGANIZER {mode_str}")
    print(f"  Total Images to Place: {len(plan)} | Skipped: {len(skipped)}")
    print("=" * 80)

    placed_by_room = {ROOMS[r][0]: 0 for r in range(7)}

    for src, dst, r, s in plan:
        rel = os.path.relpath(dst, out_root)
        folder = ROOMS[r][0]
        placed_by_room[folder] += 1
        desc = slot_description(r, s)
        room_title = ROOMS[r][2]
        action_tag = "[WOULD COPY]" if dry_run else "[PLACED]    "
        print(f"{action_tag} {os.path.basename(src):<32s} -> {room_title} (Slot {s:02d})")
        print(f"             └─ Wall Location: {desc}")

    if not dry_run:
        for src, dst, r, s in plan:
            convert_to_png(src, dst)

    print("\n" + "-" * 80)
    print("  ROOM SUMMARY & OCCUPANCY (75 Total Slots):")
    print("-" * 80)
    total_placed = sum(placed_by_room.values())
    for r in range(7):
        folder, cap, title = ROOMS[r]
        filled = placed_by_room.get(folder, 0)
        status_bar = "■" * filled + "□" * (cap - filled)
        print(f"  Room {r:02d}: {title:<30s} {status_bar}  ({filled:2d}/{cap:2d} placed)")
    print(f"  Total Placed Across Museum: {total_placed}/75 photos")

    if skipped:
        print("\n" + "-" * 80)
        print(f"  SKIPPED FILES ({len(skipped)}):")
        print("-" * 80)
        for fn, reason in skipped:
            print(f"  • {os.path.basename(fn):<35s} — {reason}")

    if not dry_run and plan:
        print("\n" + "=" * 80)
        print("  ✓ SUCCESS: Photos successfully placed into public/photos/!")
        print("    Run 'npm run build' or refresh your browser to see your new gallery walls.")
        print("=" * 80)


# ---------------------------------------------------------------------------
# Interactive Prompts & CLI Entry
# ---------------------------------------------------------------------------

def find_candidate_folders() -> list[str]:
    """Check common folders for user photos."""
    candidates = ["images", "photos", "my_photos", "raw_photos", "input", "new_photos", "gallery_photos"]
    return [c for c in candidates if os.path.isdir(c) and len(list_images(c)) > 0]


def main():
    parser = argparse.ArgumentParser(
        description="Place your photos into the 3D Museum's 75 artwork frames with zero hassle.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # 1. Zero-renaming auto-fill: automatically place photos into slots in order
  python tools/organize_photos.py --source my_photos/ --sequential

  # 2. Place photos into a specific room (e.g. Paris or Fireside)
  python tools/organize_photos.py --source trip_photos/ --room paris

  # 3. Update just one specific photo frame
  python tools/organize_photos.py --image portrait.jpg --room lobby --slot 1

  # 4. Smart filename match (handles 01_03.jpg, paris_2.jpg, etc.)
  python tools/organize_photos.py --source my_photos/

  # 5. Preview what would happen without making any changes
  python tools/organize_photos.py --source my_photos/ --dry-run
        """
    )
    parser.add_argument("--source", "-s", help="Folder containing images to organize")
    parser.add_argument("--image", "-i", help="Place a single specific image file")
    parser.add_argument("--room", "-r", help="Target room (0-6 or name: lobby, fireside, music, library, paris, orangery, alcove)")
    parser.add_argument("--slot", help="Target slot number (1-12, or 1-3 for lobby)")
    parser.add_argument("--out", "-o", default="public/photos", help="Destination root folder (default: public/photos)")
    parser.add_argument("--sequential", action="store_true", help="Auto-place photos sequentially without requiring <room>_<slot> naming")
    parser.add_argument("--folder-mode", action="store_true", help="Source contains subfolders per room (e.g. '01_fireside/', 'paris/')")
    parser.add_argument("--dry-run", action="store_true", help="Print the placement plan without copying or converting files")
    parser.add_argument("--yes", "-y", action="store_true", help="Skip confirmation prompts")

    args = parser.parse_args()

    target_room = resolve_room(args.room) if args.room is not None else None
    target_slot = int(args.slot) if args.slot is not None and args.slot.isdigit() else None

    # Handle single image placement directly
    if args.image:
        plan, skipped = build_placement_plan(
            source="",
            out_root=args.out,
            target_room=target_room,
            target_slot=target_slot,
            single_image=args.image,
        )
        execute_plan(plan, skipped, args.out, dry_run=args.dry_run)
        return

    source = args.source
    if not source:
        # Check candidate folders
        candidates = find_candidate_folders()
        if candidates:
            print(f"Found existing photo folder: '{candidates[0]}'")
            source = candidates[0]
        else:
            try:
                source = input("Enter the folder containing your photos (or press Ctrl+C to cancel): ").strip()
            except (KeyboardInterrupt, EOFError):
                print("\nCancelled.")
                return

    if not source or not os.path.isdir(source):
        print(f"[error] Folder not found: '{source}'", file=sys.stderr)
        sys.exit(1)

    plan, skipped = build_placement_plan(
        source=source,
        out_root=args.out,
        target_room=target_room,
        target_slot=target_slot,
        folder_mode=args.folder_mode,
        sequential=args.sequential,
    )

    if not plan and skipped:
        # Prompt if user wants to auto-place sequentially instead of aborting
        print(f"\n[notice] None of the files in '{source}' matched the '<room>_<slot>' naming pattern.")
        print(f"Found {len(skipped)} images that can be placed automatically.")
        if args.yes:
            choice = "y"
        else:
            try:
                choice = input("Would you like to place them sequentially across available museum frames? [Y/n]: ").strip().lower()
            except (KeyboardInterrupt, EOFError):
                choice = "n"

        if choice in ("", "y", "yes"):
            plan, skipped = build_placement_plan(
                source=source,
                out_root=args.out,
                target_room=target_room,
                target_slot=target_slot,
                folder_mode=args.folder_mode,
                sequential=True,
            )

    execute_plan(plan, skipped, args.out, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
