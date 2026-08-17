#!/bin/bash
set -e

# ============================================================
# BillGuard EC2 Deployment Script
# Run this on a fresh Ubuntu 24.04 EC2 instance (t4g.micro)
# Usage: ssh -i key.pem ubuntu@<EC2_IP> 'bash -s' < deploy.sh
# ============================================================

echo "=== BillGuard Deployment ==="

# --- 1. Install Docker ---
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose-plugin git
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker ubuntu
fi

echo "Docker version: $(docker --version)"

# --- 2. Clone / pull code ---
APP_DIR="/home/ubuntu/BillGuard"
if [ -d "$APP_DIR/.git" ]; then
    echo "Pulling latest code..."
    cd "$APP_DIR" && git pull
else
    echo "Cloning repository..."
    git clone https://github.com/YOUR_USERNAME/BillGuard.git "$APP_DIR"
    cd "$APP_DIR"
fi

cd backend

# --- 3. Create .env from template if it doesn't exist ---
if [ ! -f .env ]; then
    echo ""
    echo "=== Creating .env file ==="
    echo "You need to fill in your secrets. Enter values below (or press Enter to skip):"
    echo ""

    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)

    read -p "DB password [billguard_prod_pw]: " DB_PASSWORD
    DB_PASSWORD=${DB_PASSWORD:-billguard_prod_pw}

    read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
    read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    read -p "AWS Region [ap-south-1]: " AWS_REGION
    AWS_REGION=${AWS_REGION:-ap-south-1}
    read -p "S3 Bucket Name: " S3_BUCKET_NAME
    read -p "Gemini API Key: " GEMINI_API_KEY
    read -p "Gmail Address (SMTP_USER): " SMTP_USER
    read -p "Gmail App Password (SMTP_PASS): " SMTP_PASS

    cat > .env <<EOF
DATABASE_URL=postgresql+asyncpg://postgres:${DB_PASSWORD}@db:5432/billcheck
REDIS_URL=redis://redis:6379/0
SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
DB_PASSWORD=${DB_PASSWORD}

AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_REGION=${AWS_REGION}
S3_BUCKET_NAME=${S3_BUCKET_NAME}

GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-key.json

GEMINI_API_KEY=${GEMINI_API_KEY}
GEMINI_MODEL=gemini-2.0-flash

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASS=${SMTP_PASS}
OTP_EXPIRE_MINUTES=10

ANOMALY_THRESHOLD=1.3
FILE_RETENTION_DAYS=30
EOF

    echo ".env created. Review it with: nano $APP_DIR/backend/.env"
else
    echo ".env already exists, skipping."
fi

# --- 4. Check for GCP key ---
if [ ! -f gcp-key.json ]; then
    echo ""
    echo "WARNING: gcp-key.json not found!"
    echo "Upload your Google Cloud Vision key file:"
    echo "  scp -i key.pem gcp-key.json ubuntu@<EC2_IP>:~/BillGuard/backend/gcp-key.json"
    echo ""
fi

# --- 5. Build and start ---
echo ""
echo "=== Building and starting services ==="
docker compose -f docker-compose.prod.yml up -d --build

# --- 6. Wait for health ---
echo ""
echo "Waiting for API to be healthy..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        echo "API is healthy!"
        break
    fi
    echo "  Attempt $i/30..."
    sleep 5
done

# --- 7. Show status ---
echo ""
echo "=== Deployment Complete ==="
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo "API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<EC2_PUBLIC_IP>'):8000"
echo "Health: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo '<EC2_PUBLIC_IP>'):8000/health"
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose.prod.yml logs -f api    # API logs"
echo "  docker compose -f docker-compose.prod.yml logs -f worker # Worker logs"
echo "  docker compose -f docker-compose.prod.yml down           # Stop all"
echo "  docker compose -f docker-compose.prod.yml up -d --build  # Rebuild"
echo ""
echo "Next steps:"
echo "  1. Upload gcp-key.json if not done"
echo "  2. Seed database: docker compose -f docker-compose.prod.yml exec api python extract_and_seed.py"
echo "  3. Generate embeddings: docker compose -f docker-compose.prod.yml exec api python generate_embeddings.py"
echo "  4. Update frontend API_BASE_URL to this EC2 IP"
