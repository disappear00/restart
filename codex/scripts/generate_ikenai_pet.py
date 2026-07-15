from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


CELL_W = 192
CELL_H = 208
COLS = 8
ROWS = 11
SCALE = 4
BIG_W = CELL_W * SCALE
BIG_H = CELL_H * SCALE

OUT_DIR = Path("output/pets/ikenai")
PET_ID = "ikenai"
DISPLAY_NAME = "Ikenai"
DESCRIPTION = "A black-haired, skeptical sailor-uniform reviewer with quiet task focus."

COLORS = {
    "line": (28, 26, 32, 255),
    "hair": (18, 18, 24, 255),
    "hair_shine": (46, 48, 58, 180),
    "skin": (241, 225, 222, 255),
    "skin_shadow": (222, 203, 200, 255),
    "uniform": (242, 242, 246, 255),
    "uniform_shadow": (219, 220, 228, 255),
    "collar": (32, 39, 58, 255),
    "ribbon": (176, 58, 68, 255),
    "sock": (24, 28, 40, 255),
    "shoe": (23, 23, 29, 255),
    "blush": (225, 136, 150, 110),
}


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def wave(frames: int, index: int, lo: float, hi: float) -> float:
    phase = index / max(frames, 1)
    return lerp(lo, hi, (math.sin(phase * math.tau) + 1) / 2)


def circle_points(cx: float, cy: float, rx: float, ry: float, samples: int = 32) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for i in range(samples):
        angle = math.tau * i / samples
        points.append((cx + math.cos(angle) * rx, cy + math.sin(angle) * ry))
    return points


def thick_segment(
    start: tuple[float, float],
    end: tuple[float, float],
    width_a: float,
    width_b: float,
) -> list[tuple[float, float]]:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    length = max(math.hypot(dx, dy), 1.0)
    nx = -dy / length
    ny = dx / length
    return [
        (start[0] + nx * width_a / 2, start[1] + ny * width_a / 2),
        (end[0] + nx * width_b / 2, end[1] + ny * width_b / 2),
        (end[0] - nx * width_b / 2, end[1] - ny * width_b / 2),
        (start[0] - nx * width_a / 2, start[1] - ny * width_a / 2),
    ]


def poly(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], fill: tuple[int, int, int, int]) -> None:
    draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill)


def outline(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], width: int = 10) -> None:
    if not pts:
        return
    path = [(round(x), round(y)) for x, y in pts] + [(round(pts[0][0]), round(pts[0][1]))]
    draw.line(path, fill=COLORS["line"], width=width, joint="curve")


def draw_eye(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    *,
    half_lid: float = 0.0,
    blink: bool = False,
    looking_x: float = 0.0,
    looking_y: float = 0.0,
) -> None:
    if blink:
        draw.line(
            [(x - 22, y), (x - 10, y + 4), (x + 8, y + 4), (x + 22, y)],
            fill=COLORS["line"],
            width=8,
            joint="curve",
        )
        return
    draw.ellipse((x - 24, y - 14, x + 24, y + 16), fill=(255, 255, 255, 245))
    pupil_x = x + looking_x * 9
    pupil_y = y + looking_y * 8 + 2
    draw.ellipse((pupil_x - 9, pupil_y - 9, pupil_x + 9, pupil_y + 9), fill=COLORS["line"])
    lid_y = y - 9 + half_lid * 10
    draw.line([(x - 24, lid_y), (x - 8, lid_y - 6), (x + 24, lid_y)], fill=COLORS["line"], width=8, joint="curve")


def state_pose(state: str, frame: int) -> dict[str, float | bool]:
    pose: dict[str, float | bool] = {
        "bob": 0.0,
        "tilt": 0.0,
        "yaw": 0.0,
        "pitch": 0.0,
        "blink": False,
        "half_lid": 0.52,
        "arm_left": 25.0,
        "arm_right": -25.0,
        "forearm_left": 15.0,
        "forearm_right": -15.0,
        "leg_left": 0.0,
        "leg_right": 0.0,
        "lean": 0.0,
        "mouth": 0.0,
    }
    if state == "idle":
        pose["bob"] = [-1.5, -3.0, -1.5, 0.0, 1.0, 0.0][frame]
        pose["blink"] = frame == 2
        pose["tilt"] = [-2, -1, 0, 0, 1, 0][frame]
    elif state == "running-right":
        pose["bob"] = [0, -3, -1, 2, 0, -3, -1, 2][frame]
        pose["yaw"] = 0.95
        pose["lean"] = 10
        pose["arm_left"] = [52, 8, -26, -52, -52, -14, 20, 52][frame]
        pose["arm_right"] = [-58, -18, 10, 48, 56, 20, -10, -50][frame]
        pose["leg_left"] = [30, 8, -22, -34, -26, 0, 22, 34][frame]
        pose["leg_right"] = [-28, -6, 20, 34, 30, 4, -18, -32][frame]
        pose["mouth"] = 0.08
    elif state == "running-left":
        right = state_pose("running-right", frame)
        pose.update(right)
        pose["yaw"] = -0.95
        pose["lean"] = -10
        pose["arm_left"] = -float(right["arm_right"])
        pose["arm_right"] = -float(right["arm_left"])
        pose["leg_left"] = -float(right["leg_right"])
        pose["leg_right"] = -float(right["leg_left"])
    elif state == "waving":
        pose["bob"] = [0, -2, -1, 0][frame]
        pose["arm_left"] = 20
        pose["arm_right"] = [18, -38, -64, -10][frame]
        pose["forearm_right"] = [0, -30, -42, -10][frame]
        pose["tilt"] = [0, -3, -4, 0][frame]
        pose["blink"] = frame == 1
    elif state == "jumping":
        pose["bob"] = [0, -8, -18, -8, 0][frame]
        pose["arm_left"] = [10, -18, -30, -12, 8][frame]
        pose["arm_right"] = [-10, 18, 30, 12, -8][frame]
        pose["leg_left"] = [0, -6, -12, -6, 0][frame]
        pose["leg_right"] = [0, 6, 12, 6, 0][frame]
        pose["mouth"] = 0.1
    elif state == "failed":
        pose["bob"] = [0, 1, 2, 2, 1, 0, 1, 2][frame]
        pose["pitch"] = 0.7
        pose["half_lid"] = 0.92
        pose["arm_left"] = 46
        pose["arm_right"] = -46
        pose["forearm_left"] = 12
        pose["forearm_right"] = -12
        pose["tilt"] = -8
        pose["mouth"] = -0.3
        pose["blink"] = True
    elif state == "waiting":
        pose["bob"] = [0, -1, -2, -1, 0, 1][frame]
        pose["arm_left"] = 12
        pose["arm_right"] = -12
        pose["forearm_left"] = -36
        pose["forearm_right"] = 36
        pose["tilt"] = [-3, -2, 0, 2, 3, 0][frame]
        pose["mouth"] = 0.06
    elif state == "running":
        pose["bob"] = [0, -2, -1, 1, 2, 0][frame]
        pose["arm_left"] = [16, -2, -10, -2, 10, 16][frame]
        pose["arm_right"] = [-42, -28, -20, -28, -40, -42][frame]
        pose["forearm_right"] = [-62, -48, -40, -48, -58, -62][frame]
        pose["forearm_left"] = [8, -12, -22, -12, 6, 8][frame]
        pose["tilt"] = [-2, -1, 1, 2, 1, -1][frame]
        pose["pitch"] = -0.15
        pose["mouth"] = 0.02
    elif state == "review":
        pose["bob"] = [0, -1, -1, 0, 1, 0][frame]
        pose["arm_left"] = [8, 0, -4, 0, 8, 10][frame]
        pose["forearm_left"] = [-30, -40, -44, -40, -34, -30][frame]
        pose["arm_right"] = [-18, -18, -18, -18, -18, -18][frame]
        pose["forearm_right"] = [-4, -8, -10, -8, -4, -4][frame]
        pose["tilt"] = [4, 6, 8, 6, 4, 4][frame]
        pose["blink"] = frame == 2
        pose["mouth"] = 0.04
    return pose


def look_pose(angle_deg: float) -> dict[str, float | bool]:
    yaw = math.sin(math.radians(angle_deg))
    pitch = -math.cos(math.radians(angle_deg))
    return {
        "bob": 0.0,
        "tilt": yaw * 5,
        "yaw": yaw,
        "pitch": pitch,
        "blink": False,
        "half_lid": 0.5 + max(pitch, 0) * 0.08,
        "arm_left": 22.0,
        "arm_right": -22.0,
        "forearm_left": 10.0,
        "forearm_right": -10.0,
        "leg_left": 0.0,
        "leg_right": 0.0,
        "lean": yaw * 4,
        "mouth": pitch * 0.04,
    }


def rotate_point(x: float, y: float, cx: float, cy: float, degrees: float) -> tuple[float, float]:
    radians = math.radians(degrees)
    dx = x - cx
    dy = y - cy
    return (
        cx + dx * math.cos(radians) - dy * math.sin(radians),
        cy + dx * math.sin(radians) + dy * math.cos(radians),
    )


def arm_points(shoulder: tuple[float, float], upper_len: float, lower_len: float, upper_angle: float, lower_angle: float) -> tuple[tuple[float, float], tuple[float, float]]:
    elbow = (
        shoulder[0] + math.cos(math.radians(upper_angle)) * upper_len,
        shoulder[1] + math.sin(math.radians(upper_angle)) * upper_len,
    )
    hand = (
        elbow[0] + math.cos(math.radians(lower_angle)) * lower_len,
        elbow[1] + math.sin(math.radians(lower_angle)) * lower_len,
    )
    return elbow, hand


def leg_point(hip: tuple[float, float], length: float, angle: float) -> tuple[float, float]:
    return (
        hip[0] + math.cos(math.radians(angle)) * length,
        hip[1] + math.sin(math.radians(angle)) * length,
    )


def draw_character(pose: dict[str, float | bool], *, state: str) -> Image.Image:
    image = Image.new("RGBA", (BIG_W, BIG_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")

    cx = BIG_W / 2 + float(pose["lean"]) * SCALE * 0.5
    base_y = 395 + float(pose["bob"]) * SCALE * 5
    head_cx = cx
    head_cy = 300 + float(pose["bob"]) * SCALE * 6
    head_rx = 118
    head_ry = 128
    tilt = float(pose["tilt"])
    yaw = float(pose["yaw"])
    pitch = float(pose["pitch"])

    blouse = [
        (cx - 148, base_y - 40),
        (cx + 148, base_y - 40),
        (cx + 112, base_y + 160),
        (cx - 112, base_y + 160),
    ]
    poly(draw, blouse, COLORS["uniform"])
    outline(draw, blouse, width=12)

    sailor = [
        (cx - 146, base_y - 32),
        (cx + 146, base_y - 32),
        (cx + 74, base_y + 74),
        (cx, base_y + 24),
        (cx - 74, base_y + 74),
    ]
    poly(draw, sailor, COLORS["collar"])

    ribbon_left = [(cx - 10, base_y + 32), (cx - 78, base_y + 74), (cx - 20, base_y + 122)]
    ribbon_right = [(cx + 10, base_y + 32), (cx + 78, base_y + 74), (cx + 20, base_y + 122)]
    poly(draw, ribbon_left, COLORS["ribbon"])
    poly(draw, ribbon_right, COLORS["ribbon"])
    draw.ellipse((cx - 18, base_y + 26, cx + 18, base_y + 62), fill=COLORS["ribbon"], outline=COLORS["line"], width=8)

    skirt = [
        (cx - 96, base_y + 144),
        (cx + 96, base_y + 144),
        (cx + 124, base_y + 255),
        (cx - 124, base_y + 255),
    ]
    poly(draw, skirt, COLORS["collar"])
    outline(draw, skirt, width=10)
    for offset in (-58, -20, 20, 58):
        draw.line([(cx + offset, base_y + 152), (cx + offset * 1.25, base_y + 248)], fill=(62, 72, 100, 150), width=6)

    shoulder_left = rotate_point(cx - 120, base_y + 10, cx, base_y + 10, tilt / 2)
    shoulder_right = rotate_point(cx + 120, base_y + 10, cx, base_y + 10, tilt / 2)

    elbow_l, hand_l = arm_points(
        shoulder_left,
        112,
        92,
        90 + float(pose["arm_left"]),
        90 + float(pose["forearm_left"]),
    )
    elbow_r, hand_r = arm_points(
        shoulder_right,
        112,
        92,
        90 + float(pose["arm_right"]),
        90 + float(pose["forearm_right"]),
    )

    for upper, lower in (
        (thick_segment(shoulder_left, elbow_l, 72, 58), thick_segment(elbow_l, hand_l, 58, 34)),
        (thick_segment(shoulder_right, elbow_r, 72, 58), thick_segment(elbow_r, hand_r, 58, 34)),
    ):
        poly(draw, upper, COLORS["uniform"])
        outline(draw, upper, width=10)
        poly(draw, lower, COLORS["uniform"])
        outline(draw, lower, width=10)

    for hand in (hand_l, hand_r):
        draw.ellipse((hand[0] - 18, hand[1] - 18, hand[0] + 18, hand[1] + 18), fill=COLORS["skin"], outline=COLORS["line"], width=7)

    hip_l = (cx - 46, base_y + 246)
    hip_r = (cx + 46, base_y + 246)
    knee_l = leg_point(hip_l, 104, 92 + float(pose["leg_left"]))
    knee_r = leg_point(hip_r, 104, 88 + float(pose["leg_right"]))
    foot_l = leg_point(knee_l, 86, 92 + float(pose["leg_left"]) / 2)
    foot_r = leg_point(knee_r, 86, 88 + float(pose["leg_right"]) / 2)
    for thigh, calf in (
        (thick_segment(hip_l, knee_l, 34, 28), thick_segment(knee_l, foot_l, 28, 24)),
        (thick_segment(hip_r, knee_r, 34, 28), thick_segment(knee_r, foot_r, 28, 24)),
    ):
        poly(draw, thigh, COLORS["skin"])
        poly(draw, calf, COLORS["skin"])
        outline(draw, thigh, width=8)
        outline(draw, calf, width=8)
    for foot in (foot_l, foot_r):
        draw.rounded_rectangle((foot[0] - 24, foot[1] - 18, foot[0] + 30, foot[1] + 18), radius=14, fill=COLORS["shoe"], outline=COLORS["line"], width=7)

    face_shift_x = yaw * 22
    face_shift_y = pitch * 16
    face_box = (
        head_cx - 92 + face_shift_x,
        head_cy - 98 + face_shift_y,
        head_cx + 92 + face_shift_x,
        head_cy + 106 + face_shift_y,
    )
    draw.ellipse(face_box, fill=COLORS["skin"], outline=COLORS["line"], width=10)
    draw.ellipse((face_box[0] + 10, face_box[1] + 40, face_box[2] - 10, face_box[3] + 16), fill=COLORS["skin_shadow"])

    hair_back = circle_points(head_cx, head_cy + 8, head_rx + 26, head_ry + 14, 36)
    poly(draw, hair_back, COLORS["hair"])

    bang_cover = 112 if yaw <= 0 else 72
    front_hair = [
        (head_cx - 148, head_cy - 86),
        (head_cx - 104, head_cy - 154),
        (head_cx + 74, head_cy - 162),
        (head_cx + 150, head_cy - 62),
        (head_cx + 120, head_cy + 78),
        (head_cx + 68, head_cy + 172),
        (head_cx + 8, head_cy + 104),
        (head_cx - bang_cover, head_cy + 140),
        (head_cx - 148, head_cy - 10),
    ]
    poly(draw, front_hair, COLORS["hair"])
    left_lock = [(head_cx - 120, head_cy + 12), (head_cx - 164, head_cy + 166), (head_cx - 84, head_cy + 210), (head_cx - 42, head_cy + 52)]
    right_lock = [(head_cx + 92, head_cy + 8), (head_cx + 152, head_cy + 168), (head_cx + 88, head_cy + 216), (head_cx + 34, head_cy + 42)]
    poly(draw, left_lock, COLORS["hair"])
    poly(draw, right_lock, COLORS["hair"])
    draw.line(
        [(head_cx - 70, head_cy - 120), (head_cx - 26, head_cy - 72), (head_cx + 30, head_cy - 30)],
        fill=COLORS["hair_shine"],
        width=18,
        joint="curve",
    )

    eye_y = head_cy - 2 + pitch * 14
    looking_x = yaw * 0.9
    looking_y = pitch * 0.8
    draw_eye(
        draw,
        head_cx + 42 + yaw * 14,
        eye_y,
        half_lid=float(pose["half_lid"]),
        blink=bool(pose["blink"]),
        looking_x=looking_x,
        looking_y=looking_y,
    )

    brow_y = eye_y - 34
    draw.line([(head_cx + 12, brow_y), (head_cx + 60, brow_y - 8 + yaw * 3)], fill=COLORS["line"], width=7)
    nose = [
        (head_cx + 18 + yaw * 20, head_cy + 26 + pitch * 12),
        (head_cx + 36 + yaw * 18, head_cy + 48 + pitch * 12),
        (head_cx + 12 + yaw * 18, head_cy + 48 + pitch * 10),
    ]
    poly(draw, nose, COLORS["skin_shadow"])
    mouth_y = head_cy + 88 + pitch * 12
    mouth_curve = float(pose["mouth"])
    draw.line(
        [
            (head_cx - 8 + yaw * 12, mouth_y),
            (head_cx + 22 + yaw * 12, mouth_y + mouth_curve * 18),
            (head_cx + 50 + yaw * 12, mouth_y),
        ],
        fill=COLORS["line"],
        width=7,
        joint="curve",
    )

    draw.ellipse((head_cx + 20, head_cy + 36, head_cx + 56, head_cy + 62), fill=COLORS["blush"])
    draw.ellipse((head_cx - 28, head_cy + 50, head_cx - 2, head_cy + 72), fill=COLORS["blush"])

    if state == "review":
        draw.line([(hand_l[0], hand_l[1]), (hand_l[0] + 20, hand_l[1] - 30)], fill=COLORS["line"], width=6)
    if state == "running":
        draw.line([(head_cx + 74, head_cy - 82), (head_cx + 104, head_cy - 114)], fill=COLORS["line"], width=8)

    return image.resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)


def build_cell(row: int, col: int) -> Image.Image:
    if row == 0 and col < 6:
        return draw_character(state_pose("idle", col), state="idle")
    if row == 0 and col == 6:
        return draw_character(look_pose(0), state="look")
    if row == 1:
        return draw_character(state_pose("running-right", col), state="running-right")
    if row == 2:
        return draw_character(state_pose("running-left", col), state="running-left")
    if row == 3 and col < 4:
        return draw_character(state_pose("waving", col), state="waving")
    if row == 4 and col < 5:
        return draw_character(state_pose("jumping", col), state="jumping")
    if row == 5:
        return draw_character(state_pose("failed", col), state="failed")
    if row == 6 and col < 6:
        return draw_character(state_pose("waiting", col), state="waiting")
    if row == 7 and col < 6:
        return draw_character(state_pose("running", col), state="running")
    if row == 8 and col < 6:
        return draw_character(state_pose("review", col), state="review")
    if row == 9:
        angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5]
        return draw_character(look_pose(angles[col]), state="look")
    if row == 10:
        angles = [180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5]
        return draw_character(look_pose(angles[col]), state="look")
    return Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))


def make_preview(sheet: Image.Image) -> Image.Image:
    preview = sheet.copy().resize((sheet.width // 2, sheet.height // 2), Image.Resampling.LANCZOS)
    preview = preview.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))
    return preview


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    for row in range(ROWS):
        for col in range(COLS):
            cell = build_cell(row, col)
            sheet.alpha_composite(cell, (col * CELL_W, row * CELL_H))

    png_path = OUT_DIR / "spritesheet.png"
    webp_path = OUT_DIR / "spritesheet.webp"
    preview_path = OUT_DIR / "preview.png"
    manifest_path = OUT_DIR / "pet.json"
    metadata_path = OUT_DIR / "build-metadata.json"

    sheet.save(png_path)
    sheet.save(webp_path, lossless=True, quality=100, method=6)
    make_preview(sheet).save(preview_path)
    manifest_path.write_text(
        json.dumps(
            {
                "id": PET_ID,
                "displayName": DISPLAY_NAME,
                "description": DESCRIPTION,
                "spriteVersionNumber": 2,
                "spritesheetPath": "spritesheet.webp",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    metadata_path.write_text(
        json.dumps(
            {
                "source_style": "deterministic reference-grounded illustration",
                "appearance_cues": [
                    "black bob hair covering one eye",
                    "skeptical sleepy expression",
                    "sailor uniform silhouette",
                    "restrained review-oriented motion",
                ],
                "reference_image": "C:/Users/HP/AppData/Local/Temp/codex-clipboard-9e19b563-7322-40fd-a14e-a99331cbc3c4.png",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
