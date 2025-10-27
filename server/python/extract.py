import cv2
import numpy as np
from utils import bits_to_text, image_to_blocks, apply_dct

def extract_watermark(image_path: str, key: int = 1234, watermark_length: int = None) -> str:
    """Y 채널에서 ASCII 워터마크 추출 (부호 기반)"""
    img = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if img is None:
        raise FileNotFoundError(f"이미지를 불러올 수 없습니다: {image_path}")

    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    y, _, _ = cv2.split(ycrcb)

    blocks = image_to_blocks(y)
    if watermark_length is None:
        raise ValueError("watermark_length를 삽입 시 비트 수로 지정해야 합니다.")

    np.random.seed(key)
    extract_positions = np.random.choice(len(blocks), watermark_length, replace=False)

    extracted_bits = []
    for pos in extract_positions:
        block = blocks[pos]
        dct_block = apply_dct(block)
        # 부호로 판단
        bit = 1 if dct_block[4, 3] >= 0 else 0
        extracted_bits.append(bit)

    extracted_text = bits_to_text(extracted_bits)
    print("워터마크 추출 완료")
    return extracted_text
