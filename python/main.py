from embed import embed_watermark
from extract import extract_watermark

def main():
    # 워터마크 삽입
    watermark = "qwerlrel_2025/10/06_21:43"
    embed_watermark(r"C:\Users\leegw\Desktop\crypto-watermark-service-main\server\uploads\original\milie104-64081a640351.png", watermark, "watermarked.png", key=42)

    # 워터마크 추출
    wm_bits_length = len(watermark) * 8
    result = extract_watermark("watermarked.png", key=42, watermark_length=wm_bits_length)
    print("Extracted Watermark:", result)

if __name__ == "__main__":
    main()
