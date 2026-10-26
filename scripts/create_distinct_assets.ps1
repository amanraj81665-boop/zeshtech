Add-Type -AssemblyName System.Drawing

function Transform-ImageColor($srcPath, $dstPath, $rScale, $gScale, $bScale, $brightness = 0, $contrast = 1.0) {
    if (-not (Test-Path $srcPath)) {
        Write-Warning "Source not found: $srcPath"
        return
    }

    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    $dst = New-Object System.Drawing.Bitmap($src.Width, $src.Height)
    $g = [System.Drawing.Graphics]::FromImage($dst)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)

    # Calculate ColorMatrix elements
    # Scale RGB and adjust brightness/contrast
    $r = [float]($rScale * $contrast)
    $g_val = [float]($gScale * $contrast)
    $b = [float]($bScale * $contrast)
    $shift = [float]$brightness

    $cm = New-Object System.Drawing.Imaging.ColorMatrix
    $cm.Matrix00 = $r
    $cm.Matrix11 = $g_val
    $cm.Matrix22 = $b
    $cm.Matrix33 = 1.0
    $cm.Matrix40 = $shift
    $cm.Matrix41 = $shift
    $cm.Matrix42 = $shift
    $cm.Matrix44 = 1.0

    $ia = New-Object System.Drawing.Imaging.ImageAttributes
    $ia.SetColorMatrix($cm)

    $rect = New-Object System.Drawing.Rectangle(0, 0, $src.Width, $src.Height)
    $g.DrawImage($src, $rect, 0, 0, $src.Width, $src.Height, [System.Drawing.GraphicsUnit]::Pixel, $ia)

    $src.Dispose()
    $g.Dispose()
    $ia.Dispose()

    # Save as high-quality JPEG
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]88)

    $dst.Save($dstPath, $codec, $encParams)
    $dst.Dispose()
    $encParams.Dispose()
    Write-Host "Created distinct render: $dstPath"
}

$dir = "c:\Users\amanr\OneDrive\Desktop\ZeshTech\public\images\products"

# 1. Violet / Purple models differentiation:
# samsung-a07-violet -> Soft lavender with subtle cool pink-violet tones
Transform-ImageColor "$dir\samsung-a07-violet.jpg" "$dir\samsung-a07-violet.jpg" 1.05 0.90 1.15 0.04 1.05
# oppo-k14x-violet -> Deep crystalline royal purple
Transform-ImageColor "$dir\oppo-k14x-violet.jpg" "$dir\oppo-k14x-violet.jpg" 0.92 0.82 1.25 -0.02 1.12
# redmi-purple -> Cosmic nebula lilac purple
Transform-ImageColor "$dir\redmi-purple.jpg" "$dir\redmi-purple.jpg" 1.10 0.85 1.10 0.02 1.08

# 2. Green models differentiation:
# oppo-a6x-green -> Jade / emerald bright shimmer
Transform-ImageColor "$dir\oppo-a6x-green.jpg" "$dir\oppo-a6x-green.jpg" 0.85 1.15 0.90 0.03 1.10
# realme-p4lite-green -> Cyber lime neon green matrix
Transform-ImageColor "$dir\realme-p4lite-green.jpg" "$dir\realme-p4lite-green.jpg" 0.95 1.20 0.70 0.02 1.15
# vivo-t5x-green -> Deep dark forest green metallic
Transform-ImageColor "$dir\vivo-t5x-green.jpg" "$dir\vivo-t5x-green.jpg" 0.70 1.05 0.80 -0.05 1.18

# 3. Blue models differentiation:
# oppo-k14x-blue -> Ice Blue (bright, crystalline light cyan)
Transform-ImageColor "$dir\oppo-k14x-blue.jpg" "$dir\oppo-k14x-blue.jpg" 0.75 1.05 1.25 0.08 1.05
# oppo-f35-blue -> Royal sapphire jewel blue
Transform-ImageColor "$dir\oppo-f35-blue.jpg" "$dir\oppo-f35-blue.jpg" 0.70 0.85 1.30 -0.04 1.20
# moto-blue -> Pantone cobalt textured blue
Transform-ImageColor "$dir\moto-blue.jpg" "$dir\moto-blue.jpg" 0.80 0.95 1.15 -0.02 1.10
# oppo-a6x-blue -> Ocean sky blue
Transform-ImageColor "$dir\oppo-a6x-blue.jpg" "$dir\oppo-a6x-blue.jpg" 0.80 1.00 1.20 0.03 1.08
# redmi-blue -> Deep azure twilight blue
Transform-ImageColor "$dir\redmi-blue.jpg" "$dir\redmi-blue.jpg" 0.65 0.85 1.25 -0.05 1.15

# 4. Black models differentiation:
# poco-m8x-black -> Matte dark graphite carbon
Transform-ImageColor "$dir\poco-m8x-black.jpg" "$dir\poco-m8x-black.jpg" 0.90 0.90 0.95 -0.04 1.15
# redmi-black -> Onyx midnight black
Transform-ImageColor "$dir\redmi-black.jpg" "$dir\redmi-black.jpg" 0.85 0.85 0.85 -0.06 1.20
# moto-black -> Sleek raven black with neutral metallic sheen
Transform-ImageColor "$dir\moto-black.jpg" "$dir\moto-black.jpg" 0.95 0.95 1.00 -0.02 1.10

# 5. Silver models differentiation:
# vivo-t5x-silver -> Starlight chrome brushed silver
Transform-ImageColor "$dir\vivo-t5x-silver.jpg" "$dir\vivo-t5x-silver.jpg" 1.05 1.05 1.10 0.05 1.12
# samsung-s25-silver -> Silver shadow titanium cool tone
Transform-ImageColor "$dir\samsung-s25-silver.jpg" "$dir\samsung-s25-silver.jpg" 0.95 0.98 1.05 0.01 1.06

# 6. Distinct itel Smart TVs:
# itel-tv-43.jpg -> Frameless 43" 4K Smart TV with itel cinematic display
Transform-ImageColor "$dir\smart-tv-43.jpg" "$dir\itel-tv-43.jpg" 1.02 0.98 1.12 0.02 1.08
# itel-tv-43a.jpg -> itel A43QUX 43" 4K Smart TV
Transform-ImageColor "$dir\smart-tv-43.jpg" "$dir\itel-tv-43a.jpg" 0.98 1.04 1.06 0.03 1.05
# itel-tv-32.jpg -> itel G32QHX 32" HD Smart TV
Transform-ImageColor "$dir\smart-tv-32.jpg" "$dir\itel-tv-32.jpg" 1.04 1.02 1.08 0.01 1.06
