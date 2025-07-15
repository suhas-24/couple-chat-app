#!/bin/bash

# Couple Chat App - Database Backup Script
# This script creates automated backups of the MongoDB database
# Usage: ./backup-database.sh [environment]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../../backups"
LOG_FILE="${BACKUP_DIR}/backup.log"
ENVIRONMENT="${1:-development}"

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

# Function to send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "${SLACK_WEBHOOK_URL}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"[${ENVIRONMENT}] Database Backup ${status}: ${message}\"}" \
            "${SLACK_WEBHOOK_URL}" 2>/dev/null || true
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    local retention_days="${BACKUP_RETENTION_DAYS:-7}"
    log "Cleaning up backups older than ${retention_days} days"
    
    find "${BACKUP_DIR}" -name "*.gz" -type f -mtime +${retention_days} -delete
    
    log "Cleanup completed"
}

# Function to verify backup
verify_backup() {
    local backup_file="$1"
    
    if [ ! -f "${backup_file}" ]; then
        log "Error: Backup file not found: ${backup_file}"
        return 1
    fi
    
    local file_size=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}" 2>/dev/null)
    
    if [ "${file_size}" -lt 1024 ]; then
        log "Error: Backup file too small: ${file_size} bytes"
        return 1
    fi
    
    # Test that the file is a valid gzip file
    if ! gzip -t "${backup_file}" 2>/dev/null; then
        log "Error: Backup file is not a valid gzip file"
        return 1
    fi
    
    log "Backup verification successful: ${backup_file} (${file_size} bytes)"
    return 0
}

# Function to create database backup
create_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_filename="couple-chat-${ENVIRONMENT}-${timestamp}.gz"
    local backup_path="${BACKUP_DIR}/${backup_filename}"
    
    log "Starting database backup for ${ENVIRONMENT} environment"
    log "Backup file: ${backup_path}"
    
    # Extract database name from URL
    local db_name=""
    if [[ "${DATABASE_URL}" =~ mongodb.*\/([^?]+) ]]; then
        db_name="${BASH_REMATCH[1]}"
    else
        log "Error: Could not extract database name from DATABASE_URL"
        return 1
    fi
    
    log "Database name: ${db_name}"
    
    # Create backup using mongodump
    if command -v mongodump &> /dev/null; then
        log "Using mongodump to create backup"
        
        # Create temporary directory for dump
        local temp_dir=$(mktemp -d)
        
        # Perform mongodump
        if mongodump --uri="${DATABASE_URL}" --out="${temp_dir}" --gzip; then
            # Create archive
            cd "${temp_dir}"
            tar -czf "${backup_path}" ./*
            
            # Cleanup temp directory
            rm -rf "${temp_dir}"
            
            log "Backup created successfully: ${backup_path}"
        else
            log "Error: mongodump failed"
            rm -rf "${temp_dir}"
            return 1
        fi
    else
        log "Error: mongodump not found. Please install MongoDB tools."
        return 1
    fi
    
    # Verify backup
    if verify_backup "${backup_path}"; then
        log "Backup verification successful"
        send_notification "SUCCESS" "Database backup completed successfully"
        return 0
    else
        log "Error: Backup verification failed"
        send_notification "FAILED" "Database backup verification failed"
        return 1
    fi
}

# Function to restore database from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "${backup_file}" ]; then
        log "Error: Backup file not specified"
        return 1
    fi
    
    if [ ! -f "${backup_file}" ]; then
        log "Error: Backup file not found: ${backup_file}"
        return 1
    fi
    
    log "Starting database restore from: ${backup_file}"
    
    # Verify backup before restore
    if ! verify_backup "${backup_file}"; then
        log "Error: Backup verification failed"
        return 1
    fi
    
    # Create temporary directory for restore
    local temp_dir=$(mktemp -d)
    
    # Extract backup
    cd "${temp_dir}"
    if ! tar -xzf "${backup_file}"; then
        log "Error: Failed to extract backup file"
        rm -rf "${temp_dir}"
        return 1
    fi
    
    # Perform restore using mongorestore
    if command -v mongorestore &> /dev/null; then
        log "Using mongorestore to restore database"
        
        if mongorestore --uri="${DATABASE_URL}" --gzip --drop "${temp_dir}"; then
            log "Database restore completed successfully"
            send_notification "SUCCESS" "Database restore completed successfully"
        else
            log "Error: mongorestore failed"
            send_notification "FAILED" "Database restore failed"
            rm -rf "${temp_dir}"
            return 1
        fi
    else
        log "Error: mongorestore not found. Please install MongoDB tools."
        rm -rf "${temp_dir}"
        return 1
    fi
    
    # Cleanup temp directory
    rm -rf "${temp_dir}"
    
    log "Database restore completed successfully"
    return 0
}

# Function to list available backups
list_backups() {
    log "Available backups:"
    ls -la "${BACKUP_DIR}"/*.gz 2>/dev/null || log "No backups found"
}

# Function to check backup health
check_backup_health() {
    local backup_count=$(ls -1 "${BACKUP_DIR}"/*.gz 2>/dev/null | wc -l)
    local latest_backup=$(ls -t "${BACKUP_DIR}"/*.gz 2>/dev/null | head -1)
    
    log "Backup health check:"
    log "  Total backups: ${backup_count}"
    
    if [ "${backup_count}" -eq 0 ]; then
        log "  Status: No backups found"
        send_notification "WARNING" "No database backups found"
        return 1
    fi
    
    if [ -n "${latest_backup}" ]; then
        local backup_age=$(( ($(date +%s) - $(stat -c%Y "${latest_backup}" 2>/dev/null || stat -f%m "${latest_backup}" 2>/dev/null)) / 86400 ))
        log "  Latest backup: $(basename "${latest_backup}")"
        log "  Age: ${backup_age} days"
        
        if [ "${backup_age}" -gt 1 ]; then
            log "  Status: Backup is old (${backup_age} days)"
            send_notification "WARNING" "Latest backup is ${backup_age} days old"
        else
            log "  Status: Backup is fresh"
        fi
    fi
    
    return 0
}

# Main execution
main() {
    local command="${1:-backup}"
    
    case "${command}" in
        "backup")
            create_backup
            cleanup_old_backups
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        "health")
            check_backup_health
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore|list|health|cleanup} [backup_file]"
            echo "  backup  - Create a new database backup"
            echo "  restore - Restore database from backup file"
            echo "  list    - List available backups"
            echo "  health  - Check backup health"
            echo "  cleanup - Remove old backups"
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"