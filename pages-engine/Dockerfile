# syntax=docker/dockerfile:1.7
FROM python:3.12-slim AS base

# Calibre for ebook conversion (ebook-convert is the workhorse).
# ffmpeg for audiobook chapter probing + bitrate metadata.
# unrar / unrar-free for CBR comics.
RUN apt-get update && apt-get install -y --no-install-recommends \
        calibre \
        ffmpeg \
        unrar-free \
        unzip \
        curl \
        wget \
        ca-certificates \
        libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PAGES_CACHE_DIR=/var/lib/pages

COPY requirements.txt .
RUN pip install -r requirements.txt

FROM base AS dev
COPY app ./app
EXPOSE 8003
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]

FROM base AS prod
COPY app ./app
RUN mkdir -p /var/lib/pages && chown -R nobody:nogroup /var/lib/pages
USER nobody
EXPOSE 8003
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port 8003 --workers ${UVICORN_WORKERS:-2} --log-level ${LOG_LEVEL:-info}"]
