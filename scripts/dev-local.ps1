$ErrorActionPreference = "Stop"

function Set-SecureProcessVariable {
    param(
        [string]$Name,
        [string]$Prompt,
        [bool]$Required = $false
    )

    $action = Read-Host -Prompt "$Prompt (copy value first, then press Enter; type SKIP to omit)"
    if ($action -match "^(?i)skip$") {
        if ($Required) {
            throw "$Name is required."
        }
        return
    }

    $clipboardValue = Get-Clipboard -Raw
    $value = if ($null -eq $clipboardValue) { "" } else { $clipboardValue.Trim() }
    if ($Required -and [string]::IsNullOrWhiteSpace($value)) {
        throw "$Name is required."
    }

    try {
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            [Environment]::SetEnvironmentVariable($Name, $value, "Process")
        }
    }
    finally {
        if ((Get-Clipboard -Raw) -ceq $clipboardValue) {
            try {
                Set-Clipboard -Value "Clipboard cleared after PawCare setup"
            }
            catch {
                Write-Warning "Could not clear the copied value; please clear your clipboard manually."
            }
        }
        $clipboardValue = $null
        $value = $null
    }
}

Set-SecureProcessVariable "MONGODB_URI" "MongoDB URI (use a rotated password; input is masked)" $true
Set-SecureProcessVariable "OPENROUTER_API_KEY" "OpenRouter API key (press Enter to skip)" $false
Set-SecureProcessVariable "NVIDIA_API_KEY" "NVIDIA API key (press Enter to skip)" $false

$env:JWT_SECRET = (node -p "require('node:crypto').randomBytes(48).toString('hex')").Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($env:JWT_SECRET)) {
    throw "Could not generate the local session secret."
}

npm run dev
