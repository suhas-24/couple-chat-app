#!/bin/bash

# Couple Chat App - Disaster Recovery Script
# This script handles disaster recovery procedures
# Usage: ./disaster-recovery.sh [action] [options]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../../backups"
LOG_FILE="${BACKUP_DIR}/disaster-recovery.log"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Load environment variables
if [ -f "${SCRIPT_DIR}/../../.env.${ENVIRONMENT}" ]; then
    source "${SCRIPT_DIR}/../../.env.${ENVIRONMENT}"
elif [ -f "${SCRIPT_DIR}/../../.env" ]; then
    source "${SCRIPT_DIR}/../../.env"
else
    echo "Error: Environment file not found"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create log file if it doesn't exist
touch "${LOG_FILE}"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Function to send critical notification
send_critical_notification() {
    local message="$1"
    
    log "CRITICAL: ${message}"
    
    # Send to all notification channels
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 CRITICAL: [${ENVIRONMENT}] ${message}\"}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
    
    if [ -n "${ALERT_EMAIL}" ]; then
        echo "${message}" | mail -s "CRITICAL: Couple Chat App Disaster Recovery" "${ALERT_EMAIL}" 2>/dev/null || true
    fi
}

# Function to check system health
check_system_health() {
    log "Checking system health..."
    
    local health_issues=0
    
    # Check database connectivity
    if ! curl -f "${DATABASE_URL%/*}/admin" >/dev/null 2>&1; then
        log "ERROR: Database is not accessible"
        health_issues=$((health_issues + 1))
    else
        log "✓ Database is accessible"
    fi
    
    # Check application health
    if ! curl -f "http://localhost:${PORT:-5000}/api/health" >/dev/null 2>&1; then
        log "ERROR: Application is not responding"
        health_issues=$((health_issues + 1))
    else
        log "✓ Application is responding"
    fi
    
    # Check disk space
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "${disk_usage}" -gt 90 ]; then
        log "ERROR: Disk usage is critical: ${disk_usage}%"
        health_issues=$((health_issues + 1))
    else
        log "✓ Disk usage is acceptable: ${disk_usage}%"
    fi
    
    # Check memory usage
    local memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "${memory_usage}" -gt 90 ]; then
        log "ERROR: Memory usage is critical: ${memory_usage}%"
        health_issues=$((health_issues + 1))
    else
        log "✓ Memory usage is acceptable: ${memory_usage}%"
    fi
    
    # Check backup health
    local backup_count=$(ls -1 "${BACKUP_DIR}"/*.gz 2>/dev/null | wc -l)
    if [ "${backup_count}" -eq 0 ]; then
        log "ERROR: No backups found"
        health_issues=$((health_issues + 1))
    else
        log "✓ Backups available: ${backup_count}"
    fi
    
    if [ "${health_issues}" -eq 0 ]; then
        log "✓ System health check passed"
        return 0
    else
        log "✗ System health check failed with ${health_issues} issues"
        return 1
    fi
}

# Function to perform emergency backup
emergency_backup() {
    log "Performing emergency backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_filename="emergency-backup-${ENVIRONMENT}-${timestamp}.gz"
    local backup_path="${BACKUP_DIR}/${backup_filename}"
    
    # Use the backup script
    if "${SCRIPT_DIR}/backup-database.sh" backup; then
        log "✓ Emergency backup completed successfully"
        send_critical_notification "Emergency backup completed successfully"
        return 0
    else
        log "✗ Emergency backup failed"
        send_critical_notification "Emergency backup failed"
        return 1
    fi
}

# Function to restore from latest backup
restore_from_backup() {
    log "Restoring from latest backup..."
    
    local latest_backup=$(ls -t "${BACKUP_DIR}"/*.gz 2>/dev/null | head -1)
    
    if [ -z "${latest_backup}" ]; then
        log "ERROR: No backup found for restoration"
        send_critical_notification "No backup found for restoration"
        return 1
    fi
    
    log "Using backup: ${latest_backup}"
    
    # Stop application
    if docker-compose down; then
        log "✓ Application stopped"
    else
        log "WARNING: Failed to stop application gracefully"
    fi
    
    # Restore database
    if "${SCRIPT_DIR}/backup-database.sh" restore "${latest_backup}"; then
        log "✓ Database restored successfully"
    else
        log "✗ Database restoration failed"
        send_critical_notification "Database restoration failed"
        return 1
    fi
    
    # Start application
    if docker-compose up -d; then
        log "✓ Application started"
        
        # Wait for application to be ready
        local max_attempts=30
        local attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if curl -f "http://localhost:${PORT:-5000}/api/health" >/dev/null 2>&1; then
                log "✓ Application is ready"
                send_critical_notification "System restored successfully from backup"
                return 0
            fi
            
            attempt=$((attempt + 1))
            sleep 10
        done
        
        log "✗ Application failed to become ready after restoration"
        send_critical_notification "Application failed to start after restoration"
        return 1
    else
        log "✗ Failed to start application"
        send_critical_notification "Failed to start application after restoration"
        return 1
    fi
}

# Function to perform full system recovery
full_system_recovery() {
    log "Starting full system recovery..."
    
    send_critical_notification "Starting full system recovery"
    
    # Step 1: Create emergency backup of current state
    log "Step 1: Creating emergency backup"
    emergency_backup
    
    # Step 2: Check for recent backups
    log "Step 2: Checking for recent backups"
    local recent_backup=$(find "${BACKUP_DIR}" -name "*.gz" -mtime -1 -type f | head -1)
    
    if [ -z "${recent_backup}" ]; then
        log "WARNING: No recent backup found (within 24h)"
        send_critical_notification "No recent backup found for recovery"
        
        # List available backups
        log "Available backups:"
        ls -la "${BACKUP_DIR}"/*.gz 2>/dev/null || log "No backups found"
    fi
    
    # Step 3: Restore from backup
    log "Step 3: Restoring from backup"
    if restore_from_backup; then
        log "✓ Full system recovery completed successfully"
        send_critical_notification "Full system recovery completed successfully"
        return 0
    else
        log "✗ Full system recovery failed"
        send_critical_notification "Full system recovery failed"
        return 1
    fi
}

# Function to perform health monitoring
health_monitoring() {
    log "Starting health monitoring..."
    
    while true; do
        if ! check_system_health; then
            log "Health check failed, triggering recovery procedures"
            
            # Attempt automatic recovery
            if full_system_recovery; then
                log "Automatic recovery successful"
            else
                log "Automatic recovery failed, manual intervention required"
                send_critical_notification "Automatic recovery failed, manual intervention required"
                break
            fi
        fi
        
        # Wait before next check
        sleep 300 # 5 minutes
    done
}

# Function to cleanup disaster recovery logs
cleanup_logs() {
    log "Cleaning up old disaster recovery logs..."
    
    # Keep only last 30 days of logs
    find "${BACKUP_DIR}" -name "disaster-recovery.log.*" -mtime +30 -delete
    
    # Rotate current log if it's too large (>10MB)
    if [ -f "${LOG_FILE}" ]; then
        local log_size=$(stat -c%s "${LOG_FILE}" 2>/dev/null || stat -f%z "${LOG_FILE}" 2>/dev/null)
        if [ "${log_size}" -gt 10485760 ]; then
            mv "${LOG_FILE}" "${LOG_FILE}.$(date '+%Y%m%d_%H%M%S')"
            touch "${LOG_FILE}"
            log "Log file rotated due to size"
        fi
    fi
    
    log "Log cleanup completed"
}

# Function to test recovery procedures
test_recovery() {
    log "Testing recovery procedures..."
    
    # Test 1: Check backup integrity
    log "Test 1: Checking backup integrity"
    local latest_backup=$(ls -t "${BACKUP_DIR}"/*.gz 2>/dev/null | head -1)
    
    if [ -n "${latest_backup}" ]; then
        if gzip -t "${latest_backup}" 2>/dev/null; then
            log "✓ Latest backup integrity check passed"
        else
            log "✗ Latest backup integrity check failed"
            return 1
        fi
    else
        log "✗ No backup found to test"
        return 1
    fi
    
    # Test 2: Check system health
    log "Test 2: Checking system health"
    if check_system_health; then
        log "✓ System health check passed"
    else
        log "✗ System health check failed"
        return 1
    fi
    
    # Test 3: Test notification system
    log "Test 3: Testing notification system"
    send_critical_notification "Disaster recovery test notification"
    log "✓ Notification system tested"
    
    log "✓ All recovery tests passed"
    return 0
}

# Function to show recovery status
show_status() {
    log "Disaster Recovery Status Report"
    log "================================"
    
    # System health
    log "System Health:"
    check_system_health
    
    # Backup status
    log "Backup Status:"
    "${SCRIPT_DIR}/backup-database.sh" health
    
    # Recent logs
    log "Recent Activity:"
    tail -20 "${LOG_FILE}"
    
    log "================================"
}

# Main execution
main() {
    local action="${1:-help}"
    
    case "${action}" in
        "health")
            check_system_health
            ;;
        "backup")
            emergency_backup
            ;;
        "restore")
            restore_from_backup
            ;;
        "recover")
            full_system_recovery
            ;;
        "monitor")
            health_monitoring
            ;;
        "test")
            test_recovery
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup_logs
            ;;
        "help")
            echo "Couple Chat App - Disaster Recovery Script"
            echo "Usage: $0 {health|backup|restore|recover|monitor|test|status|cleanup}"
            echo ""
            echo "Actions:"
            echo "  health   - Check system health"
            echo "  backup   - Create emergency backup"
            echo "  restore  - Restore from latest backup"
            echo "  recover  - Perform full system recovery"
            echo "  monitor  - Start continuous health monitoring"
            echo "  test     - Test recovery procedures"
            echo "  status   - Show recovery status report"
            echo "  cleanup  - Clean up old logs"
            echo ""
            echo "Examples:"
            echo "  $0 health          # Check current system health"
            echo "  $0 recover         # Perform full recovery"
            echo "  $0 monitor &       # Start monitoring in background"
            ;;
        *)
            echo "Unknown action: ${action}"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"