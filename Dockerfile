# MEIKURAL Voice Security Operations Center (SOC) - Production Container
# Multi-stage build for minimal attack surface and reproducible deployment

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

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache Whisper tiny.en model inside container layer for air-gapped / fast startup
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('tiny.en', device='cpu', compute_type='int8')"

# Copy application code and assets
COPY --chown=meikural:meikural . /app

# Create persistent data directory and ensure proper ownership
RUN mkdir -p /app/data && chown -R meikural:meikural /app/data /app

USER meikural

# Environment defaults
ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    PORT=8000 \
    ASR_MODEL=tiny.en

EXPOSE 8000

# Docker healthcheck querying /healthz liveness probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
