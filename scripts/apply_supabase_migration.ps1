<#
.SYNOPSIS
    Apply a Supabase SQL migration file using psql (preferred). Attempts to read a connection
    string from a .env file if one exists. Provides guidance if psql is not available.

.DESCRIPTION
    This script tries to run the given SQL file against your Supabase/Postgres database using
    the `psql` CLI. It looks for a connection string in common environment variable names inside
    a `.env` file (or you can pass a full connection string via -DbConnectionString).

.PARAMETER SqlFile
    Path to the SQL file to execute (required).

.PARAMETER EnvFile
    Path to an env file to read variables from (default: .env in repo root).

.PARAMETER DbConnectionString
    Optional explicit Postgres connection string. If provided this is used and .env is ignored.

.PARAMETER AutoConfirm
    If set, do not prompt before executing.

.EXAMPLE
    .\apply_supabase_migration.ps1 -SqlFile supabase/migrations/20251006160000_apply_fix_user_signup.sql

.NOTES
    - Requires `psql` in PATH to run automatically.
    - If psql is not available, the script prints step-by-step instructions to run the SQL
      manually via Supabase SQL Editor.
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile,

    [string]$EnvFile = ".env",

    [string]$DbConnectionString = $null,

    [switch]$AutoConfirm
)

function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host $msg -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host $msg -ForegroundColor Red }

if (-not (Test-Path $SqlFile)) {
    Write-Err "SQL file not found: $SqlFile"
    exit 2
}

# Try to find connection string from parameter or env file
if (-not $DbConnectionString) {
    if (Test-Path $EnvFile) {
        Write-Info "Reading environment file: $EnvFile"
        $lines = Get-Content $EnvFile | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') }
        $env = @{}
        foreach ($l in $lines) {
            if ($l -match '^(\w+)=(.*)$') {
                $k = $matches[1]
                $v = $matches[2]
                # remove surrounding quotes
                if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Trim('"') }
                if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Trim("'") }
                $env[$k] = $v
            }
        }

        # Common names used in this project / Supabase exports
        $candidates = @('SUPABASE_DB_URL','SUPABASE_DB_CONNECTION','SUPABASE_DATABASE_URL','SUPABASE_DB_CONNECTION_STRING','DATABASE_URL')
        foreach ($name in $candidates) {
            if ($env.ContainsKey($name) -and $env[$name]) {
                $DbConnectionString = $env[$name]
                break
            }
        }
    } else {
        Write-Warn "Env file not found at $EnvFile. You can pass -DbConnectionString '<conn>' to the script."
    }
}

if (-not $DbConnectionString) {
    Write-Warn "No database connection string found. The script cannot run the SQL automatically without psql + connection string."
    Write-Host ""
    Write-Host "Manual options:"
    Write-Host "  1) Open Supabase Console -> SQL Editor, paste the contents of $SqlFile and run it."
    Write-Host "  2) Install psql (Postgres client) and rerun this script with -DbConnectionString 'postgresql://user:pass@host:port/dbname'"
    Write-Host "  3) Use the Supabase CLI or Admin UI to run the SQL (this script does not assume a specific supabase CLI command).",
    Write-Err "Aborting: no connection string available."
    exit 3
}

# Check for psql
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Warn "psql not found in PATH. To run automatically, install the Postgres client (psql)."
    Write-Host "You can still run the SQL manually via the Supabase SQL Editor (recommended)."
    Write-Host "If you have psql installed later, rerun this script."
    exit 4
}

Write-Info "Found psql at: $($psql.Path)"
Write-Info "Using connection string (first/last chars masked): " + ($DbConnectionString.Substring(0,[Math]::Min(8,$DbConnectionString.Length)) + '...' + $DbConnectionString.Substring([Math]::Max(0,$DbConnectionString.Length-8)))

if (-not $AutoConfirm) {
    $yn = Read-Host "About to run SQL file '$SqlFile' against the configured database. Proceed? (y/N)"
    if ($yn -ne 'y' -and $yn -ne 'Y') {
        Write-Host "Aborted by user. No changes applied." -ForegroundColor Yellow
        exit 0
    }
}

try {
    Write-Info "Executing SQL file..."
    # Call psql with connection string and file. Use --set ON_ERROR_STOP=on to fail on first error.
    $startInfo = @($DbConnectionString, '-v', 'ON_ERROR_STOP=1', '-f', $SqlFile)
    & psql @startInfo
    $rc = $LASTEXITCODE
    if ($rc -eq 0) {
        Write-Host "SQL executed successfully." -ForegroundColor Green
        exit 0
    } else {
        Write-Err "psql exited with code $rc"
        exit $rc
    }
} catch {
    Write-Err "Error running psql: $($_.Exception.Message)"
    exit 10
}
