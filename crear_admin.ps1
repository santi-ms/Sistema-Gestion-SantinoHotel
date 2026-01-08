# Script para crear cuenta de administrador (dueño)
# Ejecutar desde PowerShell: .\crear_admin.ps1

$baseUrl = "https://hotel-santino-backend-production.up.railway.app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Crear Cuenta de Administrador (Dueño)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Solicitar datos al usuario
$email = Read-Host "Ingresa el email del administrador"
$contraseña = Read-Host "Ingresa la contraseña" -AsSecureString
$contraseñaTexto = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($contraseña)
)

Write-Host ""
Write-Host "Creando cuenta..." -ForegroundColor Yellow

try {
    $body = @{
        email = $email
        contraseña = $contraseñaTexto
        rol = "dueño"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -UseBasicParsing `
        -Uri "$baseUrl/registro" `
        -Method POST `
        -ContentType "application/json; charset=utf-8" `
        -Body $body

    if ($response.StatusCode -eq 200) {
        Write-Host ""
        Write-Host "✅ ¡Cuenta de administrador creada exitosamente!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Credenciales:" -ForegroundColor Cyan
        Write-Host "  Email: $email" -ForegroundColor White
        Write-Host "  Rol: dueño (administrador)" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 Ya puedes iniciar sesión en el frontend con estas credenciales" -ForegroundColor Yellow
    }
} catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "❌ Error al crear la cuenta:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
        
        if ($responseBody -match "ya existe") {
            Write-Host ""
            Write-Host "💡 El usuario ya existe. Puedes:" -ForegroundColor Yellow
            Write-Host "   1. Usar otro email" -ForegroundColor White
            Write-Host "   2. O cambiar la contraseña manualmente en la base de datos" -ForegroundColor White
        }
    } else {
        Write-Host ""
        Write-Host "❌ Error de conexión:" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}




