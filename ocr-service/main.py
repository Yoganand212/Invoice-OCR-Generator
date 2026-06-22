from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
import cv2
import numpy as np
import io
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("OCR Service ready (Tesseract 5 + OpenCV preprocessing)")


def preprocess_invoice(image_np: np.ndarray) -> np.ndarray:
    """
    Gentle preprocessing optimized for printed invoices.
    Avoids over-processing that destroys text in clean/digital invoices.
    """
    # Convert to grayscale
    if len(image_np.shape) == 3:
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
    else:
        gray = image_np

    # Gentle CLAHE — low clip limit to avoid destroying already-clear text
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Otsu's thresholding — automatically picks the best threshold
    # Much better than adaptive for clean printed invoices
    _, thresh = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    return thresh


def run_ocr(image_np: np.ndarray) -> str:
    """
    Run Tesseract with multiple PSM modes and pick the best result.
    PSM 3 = Fully automatic page segmentation (best for mixed layouts)
    PSM 6 = Uniform block (good for single-column invoices)
    """
    # Try PSM 3 first (fully automatic — handles headers, tables, mixed layouts)
    config_auto = r'--oem 3 --psm 3 -c preserve_interword_spaces=1'
    text_auto = pytesseract.image_to_string(image_np, config=config_auto)

    # Try PSM 6 as fallback (uniform block)
    config_block = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
    text_block = pytesseract.image_to_string(image_np, config=config_block)

    # Pick whichever produced more actual words (not noise)
    def word_count(t):
        words = [w for w in t.split() if len(w) > 1 and any(c.isalnum() for c in w)]
        return len(words)

    return text_auto if word_count(text_auto) >= word_count(text_block) else text_block


@app.post("/ocr")
async def process_ocr(file: UploadFile = File(...)):
    contents = await file.read()

    # Load image
    image = Image.open(io.BytesIO(contents)).convert('RGB')
    image_np = np.array(image)

    # Run OCR on BOTH raw and preprocessed, pick the better result
    preprocessed = preprocess_invoice(image_np)

    # Convert raw to grayscale for Tesseract
    gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)

    text_raw = run_ocr(gray)
    text_processed = run_ocr(preprocessed)

    # Pick whichever has more real words
    def quality_score(t):
        words = [w for w in t.split() if len(w) > 1 and any(c.isalnum() for c in w)]
        return len(words)

    full_text = text_raw if quality_score(text_raw) >= quality_score(text_processed) else text_processed

    # Get word-level bounding boxes from the best source
    best_img = gray if quality_score(text_raw) >= quality_score(text_processed) else preprocessed
    config = r'--oem 3 --psm 3 -c preserve_interword_spaces=1'
    data = pytesseract.image_to_data(best_img, config=config, output_type=pytesseract.Output.DICT)

    extracted_data = []
    n_boxes = len(data['text'])
    for i in range(n_boxes):
        text = data['text'][i].strip()
        conf = int(data['conf'][i])
        if text and conf > 0:
            x, y, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
            extracted_data.append({
                "box": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
                "text": text,
                "confidence": conf / 100.0
            })

    return {
        "status": "success",
        "full_text": full_text.strip(),
        "details": extracted_data
    }
