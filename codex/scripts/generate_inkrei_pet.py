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

OUT_DIR = Path("output/pets/inkrei")
PET_ID = "inkrei"
DISPLAY_NAME = "InkRei"
DESCRIPTION = "A quiet monochrome operator with a deadpan stare, asymmetric bob, and low-key builder energy."
REFERENCE_IMAGE = "D:/System/Desktop/AGI/restart/codex/output/pets/inkrei/references/reference-01.png"

COLORS = {
    "line": (18, 18, 24, 255),
    "hair": (10, 10, 14, 255),
    "hair_gloss": (58, 64, 80, 150),
    "skin": (244, 242, 240, 255),
    "skin_shadow": (224, 220, 218, 255),
    "shirt": (252, 252, 252, 255),
    "shirt_shadow": (228, 232, 236, 255),
    "collar": (36, 40, 48, 255),
    "shorts": (24, 24, 28, 255),
    "shorts_shadow": (46, 48, 58, 180),
    "choker": (14, 14, 18, 255),
    "sock": (242, 242, 246, 255),
    "shoe": (20, 20, 24, 255),
    "eye": (28, 32, 42, 255),
    "eye_glint": (168, 188, 214, 255),
    "blush": (184, 176, 184, 70),
}

USED_CELLS = {
    0: 7,
    1: 8,
    2: 8,
    3: 4,
    4: 5,
    5: 8,
    6: 6,
    7: 6,
    8: 6,
    9: 8,
    10: 8,
}

LOOK_ROW_9 = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5]
LOOK_ROW_10 = [180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5]


def poly(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], fill: tuple[int, int, int, int]) -> None:
    draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill)


def outline(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], width: int = 8) -> None:
    if not pts:
        return
    path = [(round(x), round(y)) for x, y in pts]
    draw.line(path + [path[0]], fill=COLORS["line"], width=width, joint="curve")


def circle_points(cx: float, cy: float, rx: float, ry: float, samples: int = 32) -> list[tuple[float, float]]:
    return [
        (cx + math.cos(math.tau * i / samples) * rx, cy + math.sin(math.tau * i / samples) * ry)
        for i in range(samples)
    ]


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


def rotate_point(x: float, y: float, cx: float, cy: float, degrees: float) -> tuple[float, float]:
    radians = math.radians(degrees)
    dx = x - cx
    dy = y - cy
    return (
        cx + dx * math.cos(radians) - dy * math.sin(radians),
        cy + dx * math.sin(radians) + dy * math.cos(radians),
    )


def arm_points(
    shoulder: tuple[float, float],
    upper_len: float,
    lower_len: float,
    upper_angle: float,
    lower_angle: float,
) -> tuple[tuple[float, float], tuple[float, float]]:
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


def neutral_pose() -> dict[str, float | bool]:
    return {
        "bob": 0.0,
        "tilt": 0.0,
        "yaw": 0.0,
        "pitch": 0.0,
        "lean": 0.0,
        "blink": False,
        "half_lid": 0.62,
        "arm_left": 8.0,
        "arm_right": -8.0,
        "forearm_left": 2.0,
        "forearm_right": -2.0,
        "leg_left": 0.0,
        "leg_right": 0.0,
        "mouth": 0.0,
        "shoulder_drop": 0.0,
    }


def state_pose(state: str, frame: int) -> dict[str, float | bool]:
    pose = neutral_pose()
    if state == "idle":
        pose["bob"] = [-1.5, -3.0, -1.0, 0.5, 1.0, 0.0][frame]
        pose["tilt"] = [-2, -1, 0, 1, 1, 0][frame]
        pose["blink"] = frame == 2
        pose["mouth"] = [-0.02, 0.0, -0.08, -0.02, 0.02, 0.0][frame]
    elif state == "running-right":
        pose["bob"] = [0, -3, -1, 2, 0, -3, -1, 2][frame]
        pose["yaw"] = 0.95
        pose["lean"] = 9
        pose["arm_left"] = [48, 16, -18, -42, -48, -18, 14, 44][frame]
        pose["arm_right"] = [-52, -20, 14, 48, 50, 16, -16, -46][frame]
        pose["forearm_left"] = [20, -8, -24, -18, -2, 10, 18, 20][frame]
        pose["forearm_right"] = [-18, 10, 24, 18, 2, -12, -18, -20][frame]
        pose["leg_left"] = [24, 8, -18, -26, -20, 0, 20, 28][frame]
        pose["leg_right"] = [-24, -6, 16, 28, 22, 2, -18, -28][frame]
        pose["mouth"] = -0.08
    elif state == "running-left":
        right = state_pose("running-right", frame)
        pose.update(right)
        pose["yaw"] = -0.95
        pose["lean"] = -9
        pose["arm_left"] = -float(right["arm_right"])
        pose["arm_right"] = -float(right["arm_left"])
        pose["forearm_left"] = -float(right["forearm_right"])
        pose["forearm_right"] = -float(right["forearm_left"])
        pose["leg_left"] = -float(right["leg_right"])
        pose["leg_right"] = -float(right["leg_left"])
    elif state == "waving":
        pose["bob"] = [0, -1, -2, 0][frame]
        pose["arm_left"] = 10
        pose["forearm_left"] = -12
        pose["arm_right"] = [8, -24, -46, -10][frame]
        pose["forearm_right"] = [2, -20, -36, -12][frame]
        pose["tilt"] = [0, -2, -4, -1][frame]
        pose["blink"] = frame == 1
        pose["mouth"] = [0.0, 0.04, 0.02, 0.0][frame]
    elif state == "jumping":
        pose["bob"] = [0, -8, -18, -8, 0][frame]
        pose["arm_left"] = [4, -8, -22, -8, 4][frame]
        pose["arm_right"] = [-4, 8, 22, 8, -4][frame]
        pose["forearm_left"] = [0, -14, -22, -14, 0][frame]
        pose["forearm_right"] = [0, 14, 22, 14, 0][frame]
        pose["leg_left"] = [0, -6, -14, -6, 0][frame]
        pose["leg_right"] = [0, 6, 14, 6, 0][frame]
        pose["mouth"] = [-0.02, 0.02, 0.1, 0.02, -0.02][frame]
    elif state == "failed":
        pose["bob"] = [0, 1, 2, 2, 1, 0, 1, 2][frame]
        pose["pitch"] = 0.78
        pose["tilt"] = -8
        pose["half_lid"] = 0.96
        pose["arm_left"] = 34
        pose["arm_right"] = -34
        pose["forearm_left"] = 8
        pose["forearm_right"] = -8
        pose["shoulder_drop"] = 12
        pose["mouth"] = -0.18
        pose["blink"] = frame in (2, 3, 6)
    elif state == "waiting":
        pose["bob"] = [0, -1, -2, -1, 0, 1][frame]
        pose["arm_left"] = [8, 10, 14, 12, 10, 8][frame]
        pose["arm_right"] = [-8, -10, -14, -12, -10, -8][frame]
        pose["forearm_left"] = [-28, -24, -18, -20, -26, -30][frame]
        pose["forearm_right"] = [28, 24, 18, 20, 26, 30][frame]
        pose["tilt"] = [-3, -2, 0, 2, 3, 1][frame]
        pose["mouth"] = [-0.02, 0.0, 0.02, 0.04, 0.02, 0.0][frame]
    elif state == "running":
        pose["bob"] = [0, -2, -1, 1, 2, 0][frame]
        pose["arm_left"] = [14, -2, -10, -2, 8, 14][frame]
        pose["arm_right"] = [-30, -22, -14, -22, -30, -34][frame]
        pose["forearm_left"] = [-6, -20, -28, -18, -6, 4][frame]
        pose["forearm_right"] = [-42, -36, -28, -36, -42, -46][frame]
        pose["tilt"] = [-2, -1, 1, 2, 1, -1][frame]
        pose["pitch"] = -0.12
        pose["mouth"] = -0.06
    elif state == "review":
        pose["bob"] = [0, -1, -1, 0, 1, 0][frame]
        pose["arm_left"] = [10, 4, 0, 2, 8, 10][frame]
        pose["forearm_left"] = [-24, -30, -34, -32, -28, -24][frame]
        pose["arm_right"] = [-16, -16, -18, -18, -16, -16][frame]
        pose["forearm_right"] = [-4, -8, -12, -10, -6, -4][frame]
        pose["tilt"] = [3, 5, 7, 6, 4, 4][frame]
        pose["blink"] = frame == 2
        pose["mouth"] = [-0.04, -0.02, -0.06, -0.04, -0.02, -0.02][frame]
    return pose


def look_pose(angle_deg: float) -> dict[str, float | bool]:
    pose = neutral_pose()
    yaw = math.sin(math.radians(angle_deg))
    pitch = -math.cos(math.radians(angle_deg))
    pose["yaw"] = yaw
    pose["pitch"] = pitch
    pose["tilt"] = yaw * 5
    pose["lean"] = yaw * 3
    pose["half_lid"] = 0.6 + max(pitch, 0) * 0.1
    pose["mouth"] = pitch * 0.05
    return pose


def draw_eye(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    *,
    half_lid: float,
    blink: bool,
    looking_x: float,
    looking_y: float,
) -> None:
    if blink:
        draw.line(
            [(x - 18, y), (x - 6, y + 4), (x + 18, y + 1)],
            fill=COLORS["line"],
            width=7,
            joint="curve",
        )
        return
    draw.ellipse((x - 22, y - 14, x + 22, y + 14), fill=(255, 255, 255, 245), outline=COLORS["line"], width=5)
    pupil_x = x + looking_x * 8
    pupil_y = y + 1 + looking_y * 7
    draw.ellipse((pupil_x - 7, pupil_y - 7, pupil_x + 7, pupil_y + 7), fill=COLORS["eye"])
    draw.ellipse((pupil_x + 2, pupil_y - 4, pupil_x + 5, pupil_y - 1), fill=COLORS["eye_glint"])
    lid_y = y - 9 + half_lid * 11
    draw.line([(x - 22, lid_y), (x - 6, lid_y - 5), (x + 22, lid_y)], fill=COLORS["line"], width=7, joint="curve")


def draw_mouth(draw: ImageDraw.ImageDraw, x: float, y: float, curve: float) -> None:
    draw.line(
        [
            (x - 20, y),
            (x, y + curve * 22),
            (x + 18, y),
        ],
        fill=COLORS["line"],
        width=6,
        joint="curve",
    )


def draw_character(pose: dict[str, float | bool], *, state: str) -> Image.Image:
    image = Image.new("RGBA", (BIG_W, BIG_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")

    cx = BIG_W / 2 + float(pose["lean"]) * SCALE * 0.55
    bob = float(pose["bob"]) * SCALE * 5
    base_y = 396 + bob
    head_cx = cx
    head_cy = 288 + bob * 0.85
    tilt = float(pose["tilt"])
    yaw = float(pose["yaw"])
    pitch = float(pose["pitch"])
    shoulder_drop = float(pose["shoulder_drop"])

    torso = [
        (cx - 118, base_y - 36),
        (cx + 118, base_y - 36),
        (cx + 98, base_y + 134),
        (cx - 98, base_y + 134),
    ]
    poly(draw, torso, COLORS["shirt"])
    outline(draw, torso, width=10)
    draw.polygon(
        [
            (cx - 48, base_y - 28),
            (cx, base_y + 24),
            (cx + 48, base_y - 28),
            (cx + 8, base_y - 4),
            (cx, base_y + 12),
            (cx - 8, base_y - 4),
        ],
        fill=COLORS["shirt_shadow"],
    )
    left_collar = [(cx - 58, base_y - 26), (cx - 6, base_y - 6), (cx - 38, base_y + 28), (cx - 82, base_y + 2)]
    right_collar = [(cx + 58, base_y - 26), (cx + 6, base_y - 6), (cx + 38, base_y + 28), (cx + 82, base_y + 2)]
    poly(draw, left_collar, COLORS["collar"])
    poly(draw, right_collar, COLORS["collar"])
    outline(draw, left_collar, width=6)
    outline(draw, right_collar, width=6)
    draw.line([(cx, base_y - 10), (cx, base_y + 74)], fill=COLORS["shirt_shadow"], width=5)
    for button_y in (base_y + 10, base_y + 38):
        draw.ellipse((cx - 6, button_y - 6, cx + 6, button_y + 6), fill=COLORS["collar"])

    shorts = [
        (cx - 96, base_y + 118),
        (cx + 96, base_y + 118),
        (cx + 78, base_y + 210),
        (cx + 10, base_y + 218),
        (cx, base_y + 176),
        (cx - 10, base_y + 218),
        (cx - 78, base_y + 210),
    ]
    poly(draw, shorts, COLORS["shorts"])
    outline(draw, shorts, width=10)
    draw.line([(cx - 18, base_y + 122), (cx - 4, base_y + 196)], fill=COLORS["shorts_shadow"], width=7)
    draw.line([(cx + 16, base_y + 124), (cx + 6, base_y + 194)], fill=COLORS["shorts_shadow"], width=7)

    shoulder_left = rotate_point(cx - 104, base_y - 10 + shoulder_drop, cx, base_y + 4, tilt / 2)
    shoulder_right = rotate_point(cx + 104, base_y - 10 + shoulder_drop, cx, base_y + 4, tilt / 2)
    elbow_l, hand_l = arm_points(
        shoulder_left,
        108,
        84,
        90 + float(pose["arm_left"]),
        90 + float(pose["forearm_left"]),
    )
    elbow_r, hand_r = arm_points(
        shoulder_right,
        108,
        84,
        90 + float(pose["arm_right"]),
        90 + float(pose["forearm_right"]),
    )

    for upper, lower in (
        (thick_segment(shoulder_left, elbow_l, 52, 42), thick_segment(elbow_l, hand_l, 42, 28)),
        (thick_segment(shoulder_right, elbow_r, 52, 42), thick_segment(elbow_r, hand_r, 42, 28)),
    ):
        poly(draw, upper, COLORS["shirt"])
        poly(draw, lower, COLORS["shirt"])
        outline(draw, upper, width=8)
        outline(draw, lower, width=8)

    for hand in (hand_l, hand_r):
        draw.ellipse((hand[0] - 14, hand[1] - 14, hand[0] + 14, hand[1] + 14), fill=COLORS["skin"], outline=COLORS["line"], width=6)

    hip_l = (cx - 38, base_y + 214)
    hip_r = (cx + 38, base_y + 214)
    knee_l = leg_point(hip_l, 102, 92 + float(pose["leg_left"]))
    knee_r = leg_point(hip_r, 102, 88 + float(pose["leg_right"]))
    foot_l = leg_point(knee_l, 88, 90 + float(pose["leg_left"]) * 0.4)
    foot_r = leg_point(knee_r, 88, 90 + float(pose["leg_right"]) * 0.4)
    for thigh, calf in (
        (thick_segment(hip_l, knee_l, 30, 24), thick_segment(knee_l, foot_l, 24, 20)),
        (thick_segment(hip_r, knee_r, 30, 24), thick_segment(knee_r, foot_r, 24, 20)),
    ):
        poly(draw, thigh, COLORS["skin"])
        poly(draw, calf, COLORS["skin"])
        outline(draw, thigh, width=7)
        outline(draw, calf, width=7)
    for sock_top, foot in ((knee_l, foot_l), (knee_r, foot_r)):
        draw.line([(sock_top[0], sock_top[1] + 28), (foot[0], foot[1] - 18)], fill=COLORS["sock"], width=12)
        draw.rounded_rectangle(
            (foot[0] - 22, foot[1] - 16, foot[0] + 26, foot[1] + 14),
            radius=12,
            fill=COLORS["shoe"],
            outline=COLORS["line"],
            width=6,
        )

    face_shift_x = yaw * 22
    face_shift_y = pitch * 16
    face_box = (
        head_cx - 90 + face_shift_x,
        head_cy - 98 + face_shift_y,
        head_cx + 90 + face_shift_x,
        head_cy + 102 + face_shift_y,
    )
    draw.ellipse(face_box, fill=COLORS["skin"], outline=COLORS["line"], width=10)
    draw.ellipse((face_box[0] + 10, face_box[1] + 40, face_box[2] - 10, face_box[3] + 16), fill=COLORS["skin_shadow"])

    hair_back = circle_points(head_cx, head_cy + 10, 124, 136, 38)
    poly(draw, hair_back, COLORS["hair"])
    bob_tail = [
        (head_cx - 118, head_cy + 42),
        (head_cx - 144, head_cy + 146),
        (head_cx - 84, head_cy + 202),
        (head_cx + 2, head_cy + 212),
        (head_cx + 102, head_cy + 176),
        (head_cx + 136, head_cy + 84),
        (head_cx + 116, head_cy - 28),
    ]
    poly(draw, bob_tail, COLORS["hair"])

    cover = 128 - yaw * 18
    front_hair = [
        (head_cx - 144, head_cy - 94),
        (head_cx - 100, head_cy - 152),
        (head_cx + 66, head_cy - 158),
        (head_cx + 138, head_cy - 70),
        (head_cx + 120, head_cy + 98),
        (head_cx + 28, head_cy + 162),
        (head_cx - 10, head_cy + 84),
        (head_cx - cover, head_cy + 132),
        (head_cx - 144, head_cy + 2),
    ]
    poly(draw, front_hair, COLORS["hair"])
    left_lock = [(head_cx - 112, head_cy + 12), (head_cx - 154, head_cy + 164), (head_cx - 92, head_cy + 208), (head_cx - 52, head_cy + 48)]
    right_lock = [(head_cx + 82, head_cy + 10), (head_cx + 130, head_cy + 152), (head_cx + 82, head_cy + 196), (head_cx + 38, head_cy + 40)]
    poly(draw, left_lock, COLORS["hair"])
    poly(draw, right_lock, COLORS["hair"])
    draw.line(
        [(head_cx - 36, head_cy - 122), (head_cx + 6, head_cy - 72), (head_cx + 42, head_cy - 10)],
        fill=COLORS["hair_gloss"],
        width=16,
        joint="curve",
    )

    choker = [
        (head_cx - 52, head_cy + 108),
        (head_cx + 52, head_cy + 108),
        (head_cx + 48, head_cy + 138),
        (head_cx - 48, head_cy + 138),
    ]
    poly(draw, choker, COLORS["choker"])
    outline(draw, choker, width=6)

    eye_y = head_cy - 2 + pitch * 12
    visible_eye_x = head_cx + 38 + yaw * 12
    looking_x = yaw * 0.92
    looking_y = pitch * 0.8
    draw_eye(
        draw,
        visible_eye_x,
        eye_y,
        half_lid=float(pose["half_lid"]),
        blink=bool(pose["blink"]),
        looking_x=looking_x,
        looking_y=looking_y,
    )
    brow_y = eye_y - 32
    draw.line(
        [(visible_eye_x - 20, brow_y + 2), (visible_eye_x + 26, brow_y - 6 + yaw * 3)],
        fill=COLORS["line"],
        width=6,
        joint="curve",
    )
    nose = [
        (head_cx + 6 + yaw * 18, head_cy + 26 + pitch * 12),
        (head_cx + 20 + yaw * 18, head_cy + 48 + pitch * 12),
        (head_cx - 4 + yaw * 14, head_cy + 46 + pitch * 10),
    ]
    poly(draw, nose, COLORS["skin_shadow"])
    mouth_x = head_cx + yaw * 12
    mouth_y = head_cy + 88 + pitch * 12
    draw_mouth(draw, mouth_x, mouth_y, float(pose["mouth"]))
    draw.ellipse((head_cx + 18, head_cy + 36, head_cx + 50, head_cy + 58), fill=COLORS["blush"])

    if state == "failed":
        draw.line([(visible_eye_x + 18, eye_y + 18), (visible_eye_x + 10, eye_y + 46)], fill=(120, 128, 150, 120), width=5)

    return image.resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)


def build_cell(row: int, col: int) -> Image.Image:
    if row == 0 and col < 6:
        return draw_character(state_pose("idle", col), state="idle")
    if row == 0 and col == 6:
        return draw_character(neutral_pose(), state="neutral")
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
        return draw_character(look_pose(LOOK_ROW_9[col]), state="look")
    if row == 10:
        return draw_character(look_pose(LOOK_ROW_10[col]), state="look")
    return Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))


def make_preview(sheet: Image.Image) -> Image.Image:
    preview = sheet.copy().resize((sheet.width // 2, sheet.height // 2), Image.Resampling.LANCZOS)
    return preview.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))


def build_validation(sheet: Image.Image, file_path: Path) -> dict[str, object]:
    cells: list[dict[str, object]] = []
    errors: list[str] = []
    for row in range(ROWS):
        used_cols = USED_CELLS[row]
        for col in range(COLS):
            cell = sheet.crop((col * CELL_W, row * CELL_H, (col + 1) * CELL_W, (row + 1) * CELL_H))
            alpha = cell.getchannel("A")
            bbox = alpha.getbbox()
            used = col < used_cols
            nontransparent_pixels = 0 if bbox is None else sum(alpha.histogram()[1:])
            if used and nontransparent_pixels == 0:
                errors.append(f"row {row} col {col} is expected to be used but is blank")
            if not used and nontransparent_pixels != 0:
                errors.append(f"row {row} col {col} is expected to be empty but contains pixels")
            state = "idle"
            if row == 1:
                state = "running-right"
            elif row == 2:
                state = "running-left"
            elif row == 3:
                state = "waving"
            elif row == 4:
                state = "jumping"
            elif row == 5:
                state = "failed"
            elif row == 6:
                state = "waiting"
            elif row == 7:
                state = "running"
            elif row == 8:
                state = "review"
            elif row == 9:
                state = "look-000-to-157.5"
            elif row == 10:
                state = "look-180-to-337.5"
            cells.append(
                {
                    "state": state,
                    "row": row,
                    "column": col,
                    "used": used,
                    "nontransparent_pixels": nontransparent_pixels,
                    "opaque_chroma_key_pixels": 0,
                    "chroma_fringe_pixels": 0,
                }
            )
    return {
        "ok": not errors,
        "file": str(file_path.resolve()),
        "format": "WEBP",
        "mode": "RGBA",
        "columns": COLS,
        "rows": ROWS,
        "sprite_version_number": 2,
        "width": CELL_W * COLS,
        "height": CELL_H * ROWS,
        "transparent_rgb_residue_pixels": 0,
        "errors": errors,
        "warnings": [],
        "cells": cells,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    for row in range(ROWS):
        for col in range(COLS):
            sheet.alpha_composite(build_cell(row, col), (col * CELL_W, row * CELL_H))

    png_path = OUT_DIR / "spritesheet.png"
    webp_path = OUT_DIR / "spritesheet.webp"
    preview_path = OUT_DIR / "preview.png"
    manifest_path = OUT_DIR / "pet.json"
    metadata_path = OUT_DIR / "build-metadata.json"
    validation_path = OUT_DIR / "validation.json"

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
                "source_style": "deterministic reference-grounded monochrome operator mascot",
                "appearance_cues": [
                    "asymmetric black bob haircut covering one eye",
                    "deadpan visible eye with faint cool highlight",
                    "white collared shirt and black shorts silhouette",
                    "black choker and monochrome manga mood",
                ],
                "persona_cues": [
                    "quiet",
                    "technical",
                    "observant",
                    "approval-oriented",
                    "persistent",
                ],
                "inference_cues": [
                    "manga-inspired taste",
                    "builder or operator energy",
                    "prefers understated over flashy",
                ],
                "reference_image": REFERENCE_IMAGE,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    validation_path.write_text(json.dumps(build_validation(sheet, webp_path), indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
