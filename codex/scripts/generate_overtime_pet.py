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

OUT_DIR = Path("output/pets/overtime")
PET_ID = "overtime"
DISPLAY_NAME = "Overtime"
DESCRIPTION = "A burgundy-haired office operator with oversized cuffs, tired eyes, and stubborn shipping energy."
REFERENCE_IMAGE = "C:/Users/HP/AppData/Local/Temp/codex-clipboard-08b36dda-f767-4a63-8bcf-3e4eae3067a3.png"

COLORS = {
    "line": (36, 26, 30, 255),
    "hair": (110, 58, 66, 255),
    "hair_shadow": (82, 40, 46, 255),
    "hair_shine": (148, 90, 98, 180),
    "clip": (200, 72, 70, 255),
    "skin": (244, 232, 221, 255),
    "skin_shadow": (227, 209, 198, 255),
    "blush": (230, 150, 148, 95),
    "suit": (57, 39, 45, 255),
    "suit_shadow": (41, 28, 33, 255),
    "shirt": (250, 246, 241, 255),
    "cuff": (255, 250, 246, 255),
    "tie": (34, 30, 36, 255),
    "shoe": (58, 41, 37, 255),
}


def circle_points(cx: float, cy: float, rx: float, ry: float, samples: int = 40) -> list[tuple[float, float]]:
    return [
        (cx + math.cos(math.tau * i / samples) * rx, cy + math.sin(math.tau * i / samples) * ry)
        for i in range(samples)
    ]


def poly(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], fill: tuple[int, int, int, int]) -> None:
    draw.polygon([(round(x), round(y)) for x, y in pts], fill=fill)


def outline(draw: ImageDraw.ImageDraw, pts: list[tuple[float, float]], width: int = 10) -> None:
    if not pts:
        return
    path = [(round(x), round(y)) for x, y in pts]
    draw.line(path + [path[0]], fill=COLORS["line"], width=width, joint="curve")


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


def rotate_point(x: float, y: float, cx: float, cy: float, degrees: float) -> tuple[float, float]:
    radians = math.radians(degrees)
    dx = x - cx
    dy = y - cy
    return (
        cx + dx * math.cos(radians) - dy * math.sin(radians),
        cy + dx * math.sin(radians) + dy * math.cos(radians),
    )


def draw_eye(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    *,
    blink: bool,
    droop: float,
    looking_x: float,
    looking_y: float,
) -> None:
    if blink:
        draw.line(
            [(x - 18, y + 6), (x - 2, y + 9), (x + 18, y + 5)],
            fill=COLORS["line"],
            width=7,
            joint="curve",
        )
        return
    draw.ellipse((x - 21, y - 13, x + 21, y + 18), fill=(255, 255, 255, 245), outline=COLORS["line"], width=5)
    pupil_x = x + looking_x * 8
    pupil_y = y + 2 + looking_y * 7
    draw.ellipse((pupil_x - 8, pupil_y - 8, pupil_x + 8, pupil_y + 8), fill=COLORS["line"])
    lid_y = y - 6 + droop * 11
    draw.line([(x - 22, lid_y), (x - 6, lid_y - 4), (x + 22, lid_y + 1)], fill=COLORS["line"], width=7, joint="curve")
    draw.line([(x - 16, y + 20), (x + 8, y + 24)], fill=(104, 86, 90, 160), width=5)


def draw_open_mouth(draw: ImageDraw.ImageDraw, x: float, y: float, openness: float) -> None:
    radius_x = 10 + max(openness, 0) * 16
    radius_y = 6 + max(openness, 0) * 20
    draw.ellipse((x - radius_x, y - radius_y, x + radius_x, y + radius_y), fill=(236, 173, 170, 255), outline=COLORS["line"], width=5)
    draw.ellipse((x - radius_x + 4, y + 1, x + radius_x - 4, y + radius_y - 2), fill=(148, 82, 86, 190))


def state_pose(state: str, frame: int) -> dict[str, float | bool]:
    pose: dict[str, float | bool] = {
        "bob": 0.0,
        "tilt": 0.0,
        "yaw": 0.0,
        "pitch": 0.0,
        "blink": False,
        "droop": 0.62,
        "arm_left": 20.0,
        "arm_right": -20.0,
        "forearm_left": 18.0,
        "forearm_right": -18.0,
        "leg_left": 0.0,
        "leg_right": 0.0,
        "lean": 0.0,
        "mouth": 0.18,
    }
    if state == "idle":
        pose["bob"] = [-2, -4, -1, 1, 0, -1][frame]
        pose["tilt"] = [-2, -1, 0, 1, 1, 0][frame]
        pose["blink"] = frame == 2
        pose["mouth"] = [0.2, 0.18, 0.08, 0.18, 0.22, 0.18][frame]
    elif state == "running-right":
        pose["bob"] = [0, -4, -2, 2, 0, -4, -2, 2][frame]
        pose["yaw"] = 0.9
        pose["lean"] = 12
        pose["arm_left"] = [52, 20, -22, -50, -54, -20, 18, 46][frame]
        pose["arm_right"] = [-56, -26, 16, 54, 54, 18, -16, -50][frame]
        pose["forearm_left"] = [40, 10, -24, -26, -8, 10, 24, 38][frame]
        pose["forearm_right"] = [-42, -14, 20, 22, 8, -10, -24, -38][frame]
        pose["leg_left"] = [26, 10, -18, -28, -18, 4, 22, 28][frame]
        pose["leg_right"] = [-24, -8, 16, 26, 20, -2, -20, -28][frame]
        pose["mouth"] = 0.1
    elif state == "running-left":
        right = state_pose("running-right", frame)
        pose.update(right)
        pose["yaw"] = -0.9
        pose["lean"] = -12
        pose["arm_left"] = -float(right["arm_right"])
        pose["arm_right"] = -float(right["arm_left"])
        pose["forearm_left"] = -float(right["forearm_right"])
        pose["forearm_right"] = -float(right["forearm_left"])
        pose["leg_left"] = -float(right["leg_right"])
        pose["leg_right"] = -float(right["leg_left"])
    elif state == "waving":
        pose["bob"] = [0, -2, -2, 0][frame]
        pose["arm_left"] = 18
        pose["forearm_left"] = 12
        pose["arm_right"] = [8, -28, -58, -8][frame]
        pose["forearm_right"] = [2, -36, -56, -14][frame]
        pose["tilt"] = [0, -2, -4, -1][frame]
        pose["blink"] = frame == 1
        pose["mouth"] = 0.14
    elif state == "jumping":
        pose["bob"] = [0, -10, -18, -10, 0][frame]
        pose["arm_left"] = [14, -8, -28, -8, 12][frame]
        pose["arm_right"] = [-14, 8, 28, 8, -12][frame]
        pose["forearm_left"] = [14, 0, -20, 0, 12][frame]
        pose["forearm_right"] = [-14, 0, 20, 0, -12][frame]
        pose["leg_left"] = [0, -8, -16, -8, 0][frame]
        pose["leg_right"] = [0, 8, 16, 8, 0][frame]
        pose["mouth"] = 0.28
    elif state == "failed":
        pose["bob"] = [0, 1, 2, 2, 1, 0, 1, 2][frame]
        pose["pitch"] = 0.65
        pose["droop"] = 0.95
        pose["arm_left"] = 42
        pose["arm_right"] = -42
        pose["forearm_left"] = 4
        pose["forearm_right"] = -4
        pose["tilt"] = -8
        pose["blink"] = frame in (2, 3, 6)
        pose["mouth"] = 0.04
    elif state == "waiting":
        pose["bob"] = [0, -1, -2, -1, 0, 1][frame]
        pose["arm_left"] = [6, 10, 14, 12, 10, 6][frame]
        pose["arm_right"] = [-6, -10, -14, -12, -10, -6][frame]
        pose["forearm_left"] = [-42, -38, -30, -34, -40, -44][frame]
        pose["forearm_right"] = [42, 38, 30, 34, 40, 44][frame]
        pose["tilt"] = [-3, -2, 0, 2, 3, 1][frame]
        pose["mouth"] = 0.22
    elif state == "running":
        pose["bob"] = [0, -2, -1, 1, 2, 0][frame]
        pose["arm_left"] = [10, -4, -14, -6, 6, 12][frame]
        pose["arm_right"] = [-36, -24, -14, -24, -34, -38][frame]
        pose["forearm_left"] = [-10, -24, -34, -24, -10, 2][frame]
        pose["forearm_right"] = [-56, -46, -38, -46, -54, -58][frame]
        pose["tilt"] = [-2, -1, 1, 2, 1, -1][frame]
        pose["pitch"] = -0.1
        pose["mouth"] = 0.1
    elif state == "review":
        pose["bob"] = [0, -1, -1, 0, 1, 0][frame]
        pose["arm_left"] = [6, 0, -4, 0, 6, 8][frame]
        pose["forearm_left"] = [-24, -34, -38, -34, -28, -24][frame]
        pose["arm_right"] = [-14, -14, -18, -18, -14, -14][frame]
        pose["forearm_right"] = [-2, -8, -12, -8, -4, -2][frame]
        pose["tilt"] = [3, 5, 7, 6, 4, 4][frame]
        pose["blink"] = frame == 2
        pose["mouth"] = 0.12
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
        "droop": 0.6 + max(pitch, 0) * 0.08,
        "arm_left": 18.0,
        "arm_right": -18.0,
        "forearm_left": 14.0,
        "forearm_right": -14.0,
        "leg_left": 0.0,
        "leg_right": 0.0,
        "lean": yaw * 4,
        "mouth": 0.16 + max(-pitch, 0) * 0.04,
    }


def draw_hand(draw: ImageDraw.ImageDraw, hand: tuple[float, float], angle: float, scale_bias: float = 1.0) -> None:
    palm_rx = 17 * scale_bias
    palm_ry = 15 * scale_bias
    draw.ellipse((hand[0] - palm_rx, hand[1] - palm_ry, hand[0] + palm_rx, hand[1] + palm_ry), fill=COLORS["skin"], outline=COLORS["line"], width=6)
    for spread in (-22, 0, 22):
        tip = (
            hand[0] + math.cos(math.radians(angle + spread)) * 26 * scale_bias,
            hand[1] + math.sin(math.radians(angle + spread)) * 26 * scale_bias,
        )
        finger = thick_segment(hand, tip, 10 * scale_bias, 6 * scale_bias)
        poly(draw, finger, COLORS["skin"])
        outline(draw, finger, width=4)


def draw_character(pose: dict[str, float | bool], *, state: str) -> Image.Image:
    image = Image.new("RGBA", (BIG_W, BIG_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")

    cx = BIG_W / 2 + float(pose["lean"]) * SCALE * 0.55
    bob = float(pose["bob"]) * SCALE * 5
    base_y = 430 + bob
    head_cx = cx
    head_cy = 242 + bob * 0.72
    tilt = float(pose["tilt"])
    yaw = float(pose["yaw"])
    pitch = float(pose["pitch"])

    jacket = [
        (cx - 112, base_y + 6),
        (cx - 78, base_y - 88),
        (cx + 80, base_y - 84),
        (cx + 112, base_y + 8),
        (cx + 90, base_y + 134),
        (cx - 90, base_y + 134),
    ]
    poly(draw, jacket, COLORS["suit"])
    outline(draw, jacket, width=11)

    lapel_left = [(cx - 64, base_y - 80), (cx - 8, base_y - 12), (cx - 24, base_y + 58), (cx - 76, base_y + 2)]
    lapel_right = [(cx + 64, base_y - 78), (cx + 4, base_y - 10), (cx + 24, base_y + 58), (cx + 78, base_y)]
    poly(draw, lapel_left, COLORS["shirt"])
    poly(draw, lapel_right, COLORS["shirt"])
    outline(draw, lapel_left, width=8)
    outline(draw, lapel_right, width=8)

    tie = [(cx - 14, base_y - 8), (cx + 14, base_y - 8), (cx + 8, base_y + 94), (cx - 8, base_y + 94)]
    poly(draw, tie, COLORS["tie"])
    outline(draw, tie, width=6)
    for button_y in (base_y + 18, base_y + 48, base_y + 78):
        draw.ellipse((cx - 8, button_y - 8, cx + 8, button_y + 8), fill=COLORS["shirt"], outline=COLORS["line"], width=4)

    skirt = [
        (cx - 82, base_y + 126),
        (cx + 82, base_y + 126),
        (cx + 98, base_y + 188),
        (cx - 98, base_y + 188),
    ]
    poly(draw, skirt, COLORS["suit"])
    outline(draw, skirt, width=9)

    shoulder_left = rotate_point(cx - 100, base_y - 48, cx, base_y - 42, tilt / 3)
    shoulder_right = rotate_point(cx + 100, base_y - 48, cx, base_y - 42, tilt / 3)

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

    for upper, lower, elbow, hand, cuff_sign in (
        (
            thick_segment(shoulder_left, elbow_l, 60, 56),
            thick_segment(elbow_l, hand_l, 54, 40),
            elbow_l,
            hand_l,
            -1,
        ),
        (
            thick_segment(shoulder_right, elbow_r, 60, 56),
            thick_segment(elbow_r, hand_r, 54, 40),
            elbow_r,
            hand_r,
            1,
        ),
    ):
        poly(draw, upper, COLORS["suit"])
        poly(draw, lower, COLORS["suit"])
        outline(draw, upper, width=9)
        outline(draw, lower, width=9)
        cuff = [
            (hand[0] - 30 * cuff_sign, hand[1] - 18),
            (hand[0] + 10 * cuff_sign, hand[1] - 28),
            (hand[0] + 18 * cuff_sign, hand[1] + 28),
            (hand[0] - 34 * cuff_sign, hand[1] + 20),
        ]
        poly(draw, cuff, COLORS["cuff"])
        outline(draw, cuff, width=7)
        hand_angle = math.degrees(math.atan2(hand[1] - elbow[1], hand[0] - elbow[0]))
        draw_hand(draw, (hand[0] + 10 * cuff_sign, hand[1] + 4), hand_angle + 16 * cuff_sign, 1.0)

    hip_l = (cx - 44, base_y + 188)
    hip_r = (cx + 44, base_y + 188)
    knee_l = leg_point(hip_l, 124, 90 + float(pose["leg_left"]))
    knee_r = leg_point(hip_r, 124, 90 + float(pose["leg_right"]))
    foot_l = leg_point(knee_l, 118, 88 + float(pose["leg_left"]) * 0.35)
    foot_r = leg_point(knee_r, 118, 92 + float(pose["leg_right"]) * 0.35)

    for thigh, calf in (
        (thick_segment(hip_l, knee_l, 54, 50), thick_segment(knee_l, foot_l, 50, 46)),
        (thick_segment(hip_r, knee_r, 54, 50), thick_segment(knee_r, foot_r, 50, 46)),
    ):
        poly(draw, thigh, COLORS["skin"])
        poly(draw, calf, COLORS["skin"])
        outline(draw, thigh, width=8)
        outline(draw, calf, width=8)

    for foot, facing in ((foot_l, -1), (foot_r, 1)):
        draw.rounded_rectangle(
            (foot[0] - 28, foot[1] - 14, foot[0] + 34, foot[1] + 18),
            radius=14,
            fill=COLORS["shoe"],
            outline=COLORS["line"],
            width=7,
        )
        draw.line([(foot[0] - 8 * facing, foot[1] + 10), (foot[0] + 22 * facing, foot[1] + 10)], fill=(88, 64, 58, 180), width=4)

    face_shift_x = yaw * 22
    face_shift_y = pitch * 12
    face_box = (
        head_cx - 78 + face_shift_x,
        head_cy - 84 + face_shift_y,
        head_cx + 78 + face_shift_x,
        head_cy + 94 + face_shift_y,
    )
    draw.ellipse(face_box, fill=COLORS["skin"], outline=COLORS["line"], width=10)
    draw.ellipse((face_box[0] + 8, face_box[1] + 48, face_box[2] - 8, face_box[3] + 8), fill=COLORS["skin_shadow"])

    hair_back = circle_points(head_cx, head_cy + 8, 106, 114, 40)
    poly(draw, hair_back, COLORS["hair"])

    back_bob = [
        (head_cx - 104, head_cy - 32),
        (head_cx - 132, head_cy + 76),
        (head_cx - 110, head_cy + 190),
        (head_cx + 18, head_cy + 206),
        (head_cx + 108, head_cy + 166),
        (head_cx + 128, head_cy + 18),
        (head_cx + 108, head_cy - 52),
    ]
    poly(draw, back_bob, COLORS["hair_shadow"])

    front_hair = [
        (head_cx - 118, head_cy - 54),
        (head_cx - 74, head_cy - 132),
        (head_cx + 44, head_cy - 128),
        (head_cx + 102, head_cy - 72),
        (head_cx + 108, head_cy + 2),
        (head_cx + 92, head_cy + 82),
        (head_cx + 40, head_cy + 102),
        (head_cx + 20, head_cy + 30),
        (head_cx - 16 - yaw * 10, head_cy + 56),
        (head_cx - 48, head_cy + 118),
        (head_cx - 86, head_cy + 118),
        (head_cx - 116, head_cy + 38),
    ]
    poly(draw, front_hair, COLORS["hair"])

    left_lock = [(head_cx - 84, head_cy + 14), (head_cx - 146, head_cy + 150), (head_cx - 92, head_cy + 198), (head_cx - 42, head_cy + 34)]
    right_lock = [(head_cx + 72, head_cy + 2), (head_cx + 120, head_cy + 112), (head_cx + 78, head_cy + 176), (head_cx + 36, head_cy + 20)]
    poly(draw, left_lock, COLORS["hair"])
    poly(draw, right_lock, COLORS["hair"])

    clip = [
        (head_cx + 38, head_cy - 66),
        (head_cx + 78, head_cy - 44),
        (head_cx + 60, head_cy - 16),
        (head_cx + 20, head_cy - 40),
    ]
    poly(draw, clip, COLORS["clip"])
    outline(draw, clip, width=6)

    draw.line(
        [(head_cx - 42, head_cy - 108), (head_cx - 4, head_cy - 72), (head_cx + 26, head_cy - 30)],
        fill=COLORS["hair_shine"],
        width=18,
        joint="curve",
    )

    eye_y = head_cy + 8 + pitch * 14
    looking_x = yaw * 0.95
    looking_y = pitch * 0.8
    draw_eye(
        draw,
        head_cx - 34 + yaw * 8,
        eye_y,
        blink=bool(pose["blink"]),
        droop=float(pose["droop"]),
        looking_x=looking_x,
        looking_y=looking_y,
    )
    draw_eye(
        draw,
        head_cx + 34 + yaw * 12,
        eye_y - 3,
        blink=bool(pose["blink"]) and state != "failed",
        droop=float(pose["droop"]) + 0.04,
        looking_x=looking_x,
        looking_y=looking_y,
    )

    brow_y = eye_y - 30
    draw.line([(head_cx - 56, brow_y), (head_cx - 12, brow_y - 8 + yaw * 2)], fill=COLORS["line"], width=6)
    draw.line([(head_cx + 12, brow_y - 2), (head_cx + 56, brow_y - 6 + yaw * 3)], fill=COLORS["line"], width=6)

    nose = [
        (head_cx + yaw * 16, head_cy + 34 + pitch * 10),
        (head_cx + 14 + yaw * 16, head_cy + 52 + pitch * 10),
        (head_cx - 10 + yaw * 14, head_cy + 52 + pitch * 8),
    ]
    poly(draw, nose, COLORS["skin_shadow"])

    mouth_x = head_cx + yaw * 12
    mouth_y = head_cy + 92 + pitch * 12
    if float(pose["mouth"]) > 0.08:
        draw_open_mouth(draw, mouth_x, mouth_y, float(pose["mouth"]))
    else:
        draw.line([(mouth_x - 18, mouth_y), (mouth_x, mouth_y + 4), (mouth_x + 18, mouth_y)], fill=COLORS["line"], width=6)

    draw.ellipse((head_cx - 56, head_cy + 42, head_cx - 26, head_cy + 64), fill=COLORS["blush"])
    draw.ellipse((head_cx + 24, head_cy + 44, head_cx + 54, head_cy + 66), fill=COLORS["blush"])

    if state == "failed":
        draw.line([(head_cx - 84, head_cy + 76), (head_cx - 70, head_cy + 98)], fill=(126, 120, 138, 170), width=6)
        draw.line([(head_cx + 72, head_cy + 74), (head_cx + 84, head_cy + 98)], fill=(126, 120, 138, 170), width=6)

    return image.resize((CELL_W, CELL_H), Image.Resampling.LANCZOS)


def build_cell(row: int, col: int) -> Image.Image:
    if row == 0 and col < 6:
        return draw_character(state_pose("idle", col), state="idle")
    if row == 0 and col == 6:
        return draw_character(look_pose(180), state="look")
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
    return preview.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=2))


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
                "source_style": "deterministic reference-grounded office mascot",
                "appearance_cues": [
                    "burgundy bob haircut",
                    "red hair clip",
                    "dark office suit silhouette",
                    "oversized white cuffs",
                    "tired focused expression",
                ],
                "persona_cues": [
                    "direct",
                    "technical",
                    "persistent",
                    "late-night builder energy",
                ],
                "reference_image": REFERENCE_IMAGE,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
