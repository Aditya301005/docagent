FROM python:3.11-slim
RUN apt-get update && apt-get install -y tesseract-ocr libgl1 git build-essential python3-dev
WORKDIR /app

COPY requirements.txt .
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
