# MEIKURAL Voice Security Operations Center (SOC) - Production Container
# Optimized for high-throughput, low-memory footprint (<300MB RAM) on Render Free Tier

FROM python:3.11-slim AS base

# System runtime dependencies: libsndfile for audio decoding, ffmpeg for transcode
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root application user for zero-trust least privilege
RUN useradd -m -u 1000 -s /bin/bash meikural

WORKDIR /app

# Configure persistent cache and environment defaults
ENV HF_HOME=/app/cache/huggingface \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    ASR_MODEL=tiny.en \
    ASR_THREADS=1

# Install lightweight PyTorch CPU-only wheel (~170MB instead of 2.8GB CUDA)
# This saves ~2.6GB download time and cuts runtime RAM from 400MB+ to ~80MB
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache Whisper tiny.en model inside container layer under /app/cache/huggingface
# This ensures zero network requests and zero runtime download memory spikes
RUN mkdir -p /app/cache/huggingface && \
    python -c "from faster_whisper import WhisperModel; WhisperModel('tiny.en', device='cpu', compute_type='int8', download_root='/app/cache/huggingface')"

# Copy application code and assets
COPY --chown=meikural:meikural . /app

# Ensure correct permissions for data and cache directories
RUN mkdir -p /app/data /app/cache && chown -R meikural:meikural /app/data /app/cache /app

USER meikural

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
