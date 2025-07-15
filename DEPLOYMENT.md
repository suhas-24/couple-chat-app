# 🚀 Couple Chat App - Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Couple Chat App to production environments using Docker containers, automated CI/CD pipelines, and monitoring systems.

## Prerequisites

### Required Software
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- MongoDB 7.0+ (or MongoDB Atlas)
- Redis 7+ (for session management)
- Nginx (for reverse proxy)
- Git
- PM2 (for process management)

### Required Accounts & Services
- GitHub (for CI/CD)
- Docker Hub (for container registry)
- MongoDB Atlas (recommended for production database)
- Google Cloud Platform (for Gemini AI API)
- Email service (Gmail, SendGrid, etc.)
- Slack/Discord (for notifications)

## Environment Configuration

### 1. Environment Files

Create environment-specific configuration files:

```bash
# Production environment
cp .env.production.example .env.production
cp .env.production.local.example .env.production.local

# Staging environment
cp .env.staging.example .env.staging
cp .env.staging.local.example .env.staging.local
```

### 2. Required Environment Variables

#### Backend (.env.production)
```bash
# Server
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/couple-chat-prod
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_secure_redis_password

# Security
JWT_SECRET=your_production_jwt_secret_256_bits
ENCRYPTION_KEY=your_production_encryption_key_32_bytes
BCRYPT_SALT_ROUNDS=12

# API Keys
GEMINI_API_KEY=your_production_gemini_api_key
GOOGLE_CLIENT_ID=your_production_google_client_id

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@your-domain.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

#### Frontend (.env.production.local)
```bash
NEXT_PUBLIC_API_URL=https://api.your-domain.com/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_google_client_id
NEXT_PUBLIC_APP_ENV=production
```

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### 1. Clone Repository
```bash
git clone https://github.com/your-org/couple-chat-app.git
cd couple-chat-app
```

#### 2. Configure Environment
```bash
# Copy and edit production environment files
cp .env.production.example .env.production
cp .env.production.local.example .env.production.local

# Edit the files with your production values
nano .env.production
nano .env.production.local
```

#### 3. Deploy with Docker Compose
```bash
# Build and start services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

#### 4. Run Database Migrations
```bash
# Enter backend container
docker-compose -f docker-compose.production.yml exec backend bash

# Run migrations
cd migrations && node migrate.js migrate

# Seed database (optional)
cd ../seeds && node seed.js production
```

### Method 2: CI/CD Pipeline

#### 1. GitHub Actions Setup

Add the following secrets to your GitHub repository:

```
DOCKER_USERNAME          # Docker Hub username
DOCKER_PASSWORD          # Docker Hub password
PRODUCTION_HOST          # Production server IP/hostname
PRODUCTION_USERNAME      # SSH username for production
PRODUCTION_SSH_KEY       # SSH private key for production
PRODUCTION_URL           # Production application URL
GEMINI_API_KEY          # Google Gemini API key
NEXT_PUBLIC_GOOGLE_CLIENT_ID  # Google OAuth client ID
SLACK_WEBHOOK           # Slack webhook URL for notifications
```

#### 2. Deploy via Git Push

```bash
# Push to main branch triggers production deployment
git push origin main

# Push to develop branch triggers staging deployment
git push origin develop
```

#### 3. Monitor Deployment

Check the GitHub Actions tab for deployment status and logs.

## Database Setup

### MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Create a database user
4. Configure network access
5. Get connection string
6. Update `DATABASE_URL` in environment files

### Local MongoDB

```bash
# Install MongoDB
sudo apt update
sudo apt install -y mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create database and user
mongo
> use couple-chat-prod
> db.createUser({
    user: "couple-chat",
    pwd: "secure_password",
    roles: ["readWrite"]
})
```

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Setup

1. Obtain SSL certificates from your provider
2. Place certificates in `docker/nginx/ssl/`
3. Update nginx configuration to use SSL

## Health Checks & Monitoring

### Health Endpoints

- **Application Health**: `GET /api/health`
- **Database Health**: `GET /api/health/ready`
- **System Metrics**: `GET /api/monitoring/metrics`
- **Monitoring Dashboard**: `http://your-domain.com/monitoring/monitoring-dashboard.html`

### Automated Health Checks

```bash
# Add to crontab
crontab -e

# Check health every 5 minutes
*/5 * * * * curl -f http://localhost:5000/api/health || echo "Health check failed" | mail -s "Health Alert" admin@your-domain.com
```

## Backup & Recovery

### Automated Backups

```bash
# Install backup scripts
chmod +x scripts/backup/backup-database.sh
chmod +x scripts/backup/disaster-recovery.sh

# Add to crontab
crontab scripts/backup/backup-cron.conf
```

### Manual Backup

```bash
# Create backup
./scripts/backup/backup-database.sh backup

# List backups
./scripts/backup/backup-database.sh list

# Restore from backup
./scripts/backup/backup-database.sh restore backup-file.gz
```

## Performance Optimization

### 1. Database Optimization

```bash
# Create indexes
cd backend/migrations
node migrate.js migrate
```

### 2. Caching

Redis is configured for:
- Session management
- API response caching
- Real-time data caching

### 3. CDN Configuration

Configure your CDN to cache static assets:
- Cache `/static/` for 1 year
- Cache `/images/` for 1 month
- Cache `/api/` for 5 minutes (if applicable)

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 2. Security Headers

Security headers are configured in nginx and application:
- HSTS
- CSP
- X-Frame-Options
- X-Content-Type-Options

### 3. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check MongoDB status
docker-compose -f docker-compose.production.yml logs mongodb

# Test connection
mongo "mongodb://localhost:27017/couple-chat-prod"
```

#### Application Not Starting
```bash
# Check application logs
docker-compose -f docker-compose.production.yml logs backend

# Check environment variables
docker-compose -f docker-compose.production.yml exec backend printenv
```

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Restart containers
docker-compose -f docker-compose.production.yml restart
```

### Log Locations

- Application logs: `backend/logs/`
- Nginx logs: `docker/nginx/logs/`
- Database logs: Docker container logs
- Backup logs: `backups/backup.log`

## Maintenance Tasks

### Daily Tasks (Automated)
- Health checks
- Log rotation
- Backup creation

### Weekly Tasks
- Security updates
- Performance review
- Backup verification

### Monthly Tasks
- SSL certificate renewal
- Dependency updates
- Security audit

## Scaling Considerations

### Horizontal Scaling

1. **Database**: Use MongoDB replica sets
2. **Application**: Deploy multiple backend instances
3. **Load Balancer**: Use Nginx or external load balancer
4. **Session Store**: Use Redis cluster

### Vertical Scaling

1. **CPU**: Increase Docker container limits
2. **Memory**: Adjust memory allocation
3. **Storage**: Use SSD storage for database

## Support & Monitoring

### Alerting Channels

- **Slack**: Configured for real-time alerts
- **Email**: Critical alerts and daily summaries
- **Dashboard**: Real-time monitoring at `/monitoring/`

### Emergency Contacts

- **DevOps**: ops@your-domain.com
- **Development**: dev@your-domain.com
- **Management**: admin@your-domain.com

### Escalation Procedures

1. **Level 1**: Automated recovery attempts
2. **Level 2**: DevOps team notification
3. **Level 3**: Development team escalation
4. **Level 4**: Management notification

## Post-Deployment Checklist

- [ ] All services are running
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Alerts configured
- [ ] Performance baselines established
- [ ] Security scan completed
- [ ] Documentation updated

## Rollback Procedures

### Quick Rollback

```bash
# Rollback to previous version
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --scale backend=0
docker-compose -f docker-compose.production.yml up -d
```

### Database Rollback

```bash
# Restore from backup
./scripts/backup/disaster-recovery.sh restore
```

### Complete System Recovery

```bash
# Full recovery procedure
./scripts/backup/disaster-recovery.sh recover
```

---

**Last Updated**: 2025-01-15  
**Version**: 1.0  
**Maintainer**: DevOps Team