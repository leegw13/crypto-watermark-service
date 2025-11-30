import cv2
import numpy as np
from utils import text_to_bits, image_to_blocks, blocks_to_image, apply_dct, apply_idct

def embed_watermark(image_path: str, watermark_data: str, output_path: str, key: int = 1234):
    """Y 채널에 ASCII 워터마크 삽입 (부호 기반)"""
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")

    # YCrCb 변환
    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    h, w = y.shape

    wm_bits = text_to_bits(watermark_data)
    wm_length = len(wm_bits)

    blocks = image_to_blocks(y)
    np.random.seed(key)
    embed_positions = np.random.choice(len(blocks), wm_length, replace=False)

    strength = 20  # 삽입 강도

    for i, pos in enumerate(embed_positions):
        block = blocks[pos]
        dct_block = apply_dct(block)

        target = dct_block[4, 3]
        # 부호 기반 삽입
        if wm_bits[i] == 1:
            dct_block[4, 3] = abs(target) + strength
        else:
            dct_block[4, 3] = -abs(target) - strength

        blocks[pos] = apply_idct(dct_block)

    watermarked_y = blocks_to_image(blocks, (h, w))
    merged = cv2.merge([
        np.clip(watermarked_y, 0, 255).astype(np.float32),
        cr.astype(np.float32),
        cb.astype(np.float32)
    ])
    watermarked_img = cv2.cvtColor(merged.astype(np.uint8), cv2.COLOR_YCrCb2BGR)
    # cv2.imwrite(output_path, watermarked_img)

    print(f"워터마크 삽입 완료: {output_path} (비트 수: {wm_length})")
