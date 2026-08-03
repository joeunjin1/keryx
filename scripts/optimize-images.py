"""
IP 굿즈 이미지 WebP 변환 스크립트
- 원본 JPG 파일을 WebP로 변환 (품질 80%)
- 최대 너비 1200px로 리사이즈
- 원본 파일은 유지하고 WebP 파일 추가 생성
"""
import os
from PIL import Image

IMAGE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'images', 'ip-goods')
MAX_WIDTH = 1200
QUALITY = 80

def optimize_image(filepath):
    """JPG/PNG 이미지를 WebP로 변환"""
    img = Image.open(filepath)
    
    # 리사이즈 (너비 기준)
    if img.width > MAX_WIDTH:
        ratio = MAX_WIDTH / img.width
        new_height = int(img.height * ratio)
        img = img.resize((MAX_WIDTH, new_height), Image.LANCZOS)
    
    # WebP로 저장
    base_name = os.path.splitext(filepath)[0]
    webp_path = base_name + '.webp'
    img.save(webp_path, 'WEBP', quality=QUALITY, method=6)
    
    original_size = os.path.getsize(filepath) / 1024
    webp_size = os.path.getsize(webp_path) / 1024
    reduction = (1 - webp_size / original_size) * 100
    
    print(f"  {os.path.basename(filepath)}: {original_size:.0f}KB → {webp_size:.0f}KB ({reduction:.0f}% 절감)")
    return webp_path

def main():
    print("=== IP 굿즈 이미지 WebP 최적화 ===\n")
    
    image_dir = os.path.abspath(IMAGE_DIR)
    if not os.path.exists(image_dir):
        print(f"디렉토리를 찾을 수 없습니다: {image_dir}")
        return
    
    total_saved = 0
    converted = 0
    
    for filename in sorted(os.listdir(image_dir)):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')) and not filename.endswith('.webp'):
            filepath = os.path.join(image_dir, filename)
            original_size = os.path.getsize(filepath)
            webp_path = optimize_image(filepath)
            webp_size = os.path.getsize(webp_path)
            total_saved += (original_size - webp_size)
            converted += 1
    
    print(f"\n총 {converted}개 파일 변환 완료")
    print(f"총 절감 용량: {total_saved / 1024 / 1024:.1f}MB")

if __name__ == '__main__':
    main()
