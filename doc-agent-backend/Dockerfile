FROM python:3.11-slim
RUN apt-get update && apt-get install -y tesseract-ocr libgl1 git build-essential python3-dev
WORKDIR /app

COPY requirements.txt .
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

COPY . .

# Sanitize line endings and make start.sh executable (in case written on Windows)
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

CMD ["./start.sh"]

