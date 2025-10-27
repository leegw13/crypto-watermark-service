import numpy as np
import cv2

def text_to_bits(text: str) -> list[int]:
    """ASCII 문자열 → 비트 리스트"""
    return [int(b) for c in text.encode('ascii') for b in bin(c)[2:].zfill(8)]

def bits_to_text(bits: list[int]) -> str:
    """비트 리스트 → ASCII 문자열"""
    chars = []
    for i in range(0, len(bits), 8):
        byte = bits[i:i+8]
        chars.append(chr(int(''.join(map(str, byte)), 2)))
    return ''.join(chars)

def image_to_blocks(channel: np.ndarray, block_size: int = 8):
    """이미지를 8x8 블록으로 분할"""
    h, w = channel.shape
    return [channel[i:i+block_size, j:j+block_size]
            for i in range(0, h, block_size)
            for j in range(0, w, block_size)]

def blocks_to_image(blocks: list[np.ndarray], shape: tuple[int, int], block_size: int = 8):
    """블록들을 다시 이미지로 병합"""
    h, w = shape
    img = np.zeros((h, w), dtype=np.float32)
    n_blocks_x = w // block_size
    for idx, block in enumerate(blocks):
        i = (idx // n_blocks_x) * block_size
        j = (idx % n_blocks_x) * block_size
        img[i:i+block_size, j:j+block_size] = block
    return img

def apply_dct(block: np.ndarray) -> np.ndarray:
    return cv2.dct(np.float32(block))

def apply_idct(block: np.ndarray) -> np.ndarray:
    return cv2.idct(np.float32(block))
