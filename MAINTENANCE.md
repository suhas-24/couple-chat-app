# 🔧 Couple Chat App - Maintenance Guide

## Overview

This guide provides comprehensive maintenance procedures for the Couple Chat App production environment, including routine tasks, troubleshooting, and performance optimization.

## Maintenance Schedule

### Daily Tasks (Automated)

#### Health Monitoring
- **Frequency**: Every 15 minutes
- **Command**: `./scripts/backup/disaster-recovery.sh health`
- **Location**: Cron job
- **Alerts**: Slack/Email on failures

#### Database Backups
- **Frequency**: Every 6 hours
- **Command**: `./scripts/backup/backup-database.sh backup`
- **Retention**: 7 days
- **Location**: `/backups/` directory

#### Log Rotation
- **Frequency**: Daily at 2 AM
- **Files**: Application logs, access logs, error logs
- **Retention**: 30 days
- **Size Limit**: 10MB per file

### Weekly Tasks

#### Security Updates
- **Frequency**: Every Sunday at 3 AM
- **Tasks**:
  - Update system packages
  - Update Docker images
  - Security vulnerability scan
  - SSL certificate check

#### Performance Review
- **Frequency**: Every Monday at 9 AM
- **Tasks**:
  - Review monitoring dashboard
  - Check response times
  - Analyze error rates
  - Memory and CPU usage review

#### Backup Verification
- **Frequency**: Every Tuesday at 10 AM
- **Tasks**:
  - Test backup integrity
  - Verify restore procedures
  - Check backup retention policy
  - Update backup documentation

### Monthly Tasks

#### Dependency Updates
- **Frequency**: First Monday of each month
- **Tasks**:
  - Update Node.js dependencies
  - Update Docker base images
  - Update MongoDB version
  - Update Redis version

#### Security Audit
- **Frequency**: Last Friday of each month
- **Tasks**:
  - Run security scan
  - Review access logs
  - Check for unauthorized access
  - Update security policies

## Routine Maintenance Procedures

### 1. System Health Check

```bash
# Check overall system health
./scripts/backup/disaster-recovery.sh health

# Check specific services
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs --tail=100

# Check resource usage
docker stats
df -h
free -h
```

### 2. Database Maintenance

```bash
# Check database health
./scripts/backup/backup-database.sh health

# Run database statistics
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.stats()"

# Check database connections
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.serverStatus().connections"

# Optimize database
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.runCommand({reIndex: 'users'})"
```

### 3. Application Maintenance

```bash
# Restart application services
docker-compose -f docker-compose.production.yml restart backend
docker-compose -f docker-compose.production.yml restart frontend

# Update application code
git pull origin main
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Check application logs
docker-compose -f docker-compose.production.yml logs backend --tail=500
docker-compose -f docker-compose.production.yml logs frontend --tail=500
```

### 4. Security Maintenance

```bash
# Update SSL certificates
sudo certbot renew --quiet

# Check firewall status
sudo ufw status

# Review failed login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Check for security updates
sudo apt list --upgradable | grep -i security
```

## Performance Optimization

### 1. Database Optimization

```bash
# Analyze slow queries
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.setProfilingLevel(2, {slowms: 100})"

# Check indexes
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.users.getIndexes()"

# Compact database
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.runCommand({compact: 'users'})"
```

### 2. Application Performance

```bash
# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/health

# Check memory usage
docker stats --no-stream | grep backend

# Profile application
docker-compose -f docker-compose.production.yml exec backend npm run profile
```

### 3. System Performance

```bash
# Check disk I/O
iostat -x 1 5

# Check network performance
iftop -i eth0

# Check CPU usage
top -bn1 | grep load

# Check memory usage
free -h && sync && echo 3 > /proc/sys/vm/drop_caches && free -h
```

## Troubleshooting Guide

### Common Issues

#### 1. Application Not Responding

**Symptoms**: HTTP 502/503 errors, timeout errors

**Diagnosis**:
```bash
# Check application status
docker-compose -f docker-compose.production.yml ps

# Check application logs
docker-compose -f docker-compose.production.yml logs backend --tail=100

# Check health endpoint
curl -f http://localhost:5000/api/health
```

**Solutions**:
```bash
# Restart application
docker-compose -f docker-compose.production.yml restart backend

# If database connection issues
docker-compose -f docker-compose.production.yml restart mongodb

# Check for memory issues
docker stats --no-stream
```

#### 2. Database Connection Issues

**Symptoms**: Database connection errors, timeout errors

**Diagnosis**:
```bash
# Check MongoDB status
docker-compose -f docker-compose.production.yml logs mongodb

# Test connection
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.runCommand({ping: 1})"

# Check connection limits
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "db.serverStatus().connections"
```

**Solutions**:
```bash
# Restart MongoDB
docker-compose -f docker-compose.production.yml restart mongodb

# Check disk space
df -h

# Check memory usage
free -h
```

#### 3. High Memory Usage

**Symptoms**: Out of memory errors, slow performance

**Diagnosis**:
```bash
# Check memory usage by container
docker stats --no-stream

# Check system memory
free -h
cat /proc/meminfo

# Check for memory leaks
docker-compose -f docker-compose.production.yml exec backend ps aux --sort=-%mem | head
```

**Solutions**:
```bash
# Restart containers
docker-compose -f docker-compose.production.yml restart

# Clear cache
docker system prune -f

# Increase memory limits
# Edit docker-compose.production.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

#### 4. SSL Certificate Issues

**Symptoms**: SSL certificate expired, mixed content warnings

**Diagnosis**:
```bash
# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/your-domain.com/cert.pem -text -noout | grep "Not After"

# Check certificate chain
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**Solutions**:
```bash
# Renew certificates
sudo certbot renew --quiet

# Restart nginx
docker-compose -f docker-compose.production.yml restart nginx

# Test SSL configuration
curl -I https://your-domain.com
```

## Monitoring & Alerting

### Key Metrics to Monitor

#### Application Metrics
- Response time (target: <500ms)
- Error rate (target: <1%)
- Request volume
- Active users
- Database connections

#### System Metrics
- CPU usage (alert: >80%)
- Memory usage (alert: >85%)
- Disk usage (alert: >90%)
- Network I/O
- Docker container health

#### Database Metrics
- Query performance
- Connection pool usage
- Index efficiency
- Replication lag (if applicable)

### Alert Configuration

```bash
# Check monitoring service
curl http://localhost:5000/api/monitoring/status

# View active alerts
curl http://localhost:5000/api/monitoring/alerts

# Test alert system
curl -X POST http://localhost:5000/api/monitoring/test-alert
```

## Backup & Recovery Procedures

### Backup Verification

```bash
# Verify latest backup
./scripts/backup/backup-database.sh list

# Test backup integrity
./scripts/backup/backup-database.sh health

# Test restore procedure (non-production)
./scripts/backup/backup-database.sh restore backup-file.gz
```

### Disaster Recovery

```bash
# Quick health check
./scripts/backup/disaster-recovery.sh health

# Emergency backup
./scripts/backup/disaster-recovery.sh backup

# Full system recovery
./scripts/backup/disaster-recovery.sh recover

# Test recovery procedures
./scripts/backup/disaster-recovery.sh test
```

## Security Maintenance

### Security Checklist

- [ ] SSL certificates valid and renewed
- [ ] Firewall rules configured and active
- [ ] Security updates applied
- [ ] Access logs reviewed
- [ ] Vulnerability scan completed
- [ ] Backup encryption verified
- [ ] API rate limiting functional
- [ ] Authentication logs reviewed

### Security Commands

```bash
# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check firewall status
sudo ufw status verbose

# Check for failed login attempts
sudo grep "Failed password" /var/log/auth.log

# Check running processes
ps aux | grep -E "(node|nginx|mongo|redis)"

# Check network connections
netstat -tulpn | grep LISTEN
```

## Performance Tuning

### Database Tuning

```bash
# Optimize MongoDB
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "
db.adminCommand({setParameter: 1, cursorTimeoutMillis: 600000});
db.adminCommand({setParameter: 1, maxConns: 1000});
"

# Create compound indexes
docker-compose -f docker-compose.production.yml exec mongodb mongo couple-chat-prod --eval "
db.messages.createIndex({chatId: 1, timestamp: -1});
db.users.createIndex({email: 1, isActive: 1});
"
```

### Application Tuning

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable compression
# Already configured in nginx.conf

# Optimize connection pooling
# Edit environment variables:
# DB_POOL_SIZE=10
# REDIS_POOL_SIZE=10
```

## Emergency Procedures

### Service Outage Response

1. **Immediate Actions**:
   - Check monitoring dashboard
   - Verify service status
   - Check error logs
   - Notify stakeholders

2. **Investigation**:
   - Identify root cause
   - Check recent changes
   - Review system metrics
   - Gather evidence

3. **Recovery**:
   - Implement fix
   - Test functionality
   - Monitor stability
   - Document incident

### Escalation Procedures

1. **Level 1**: Automated recovery (5 minutes)
2. **Level 2**: DevOps team (15 minutes)
3. **Level 3**: Development team (30 minutes)
4. **Level 4**: Management (1 hour)

## Documentation Updates

### Maintenance Log

Keep a log of all maintenance activities:

```
Date: 2025-01-15
Task: Weekly security update
Result: Success
Notes: Updated 15 packages, no issues
Next: Monitor for 24 hours
```

### Knowledge Base

Update documentation for:
- New procedures
- Common issues
- Performance optimizations
- Security updates

## Contact Information

### Emergency Contacts

- **DevOps Team**: ops@your-domain.com
- **Development Team**: dev@your-domain.com
- **Management**: admin@your-domain.com

### Service Providers

- **Hosting**: hosting-provider@example.com
- **Database**: mongodb-support@example.com
- **CDN**: cdn-support@example.com

---

**Last Updated**: 2025-01-15  
**Version**: 1.0  
**Maintainer**: DevOps Team