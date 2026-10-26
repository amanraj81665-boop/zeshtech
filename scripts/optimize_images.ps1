Add-Type -AssemblyName System.Drawing

function Optimize-ImageFile($src, $dst, $maxDim = 800, $quality = 85) {
    if (-not (Test-Path $src)) { 
        Write-Warning "Source not found: $src"
        return 
    }
    $img = [System.Drawing.Image]::FromFile($src)
    $w = $img.Width
    $h = $img.Height
    if ($w -gt $maxDim -or $h -gt $maxDim) {
        if ($w -gt $h) {
            $nh = [int]($h * $maxDim / $w)
            $nw = $maxDim
        } else {
            $nw = [int]($w * $maxDim / $h)
            $nh = $maxDim
        }
    } else {
        $nw = $w
        $nh = $h
    }
    $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($img, 0, 0, $nw, $nh)
    $img.Dispose()
    $g.Dispose()

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

    $bmp.Save($dst, $codec, $encParams)
    $bmp.Dispose()
    $encParams.Dispose()
    Write-Host "Optimized $src -> $dst"
}

$prodDir = "c:\Users\amanr\OneDrive\Desktop\ZeshTech\public\images\products"
$brainDir = "C:\Users\amanr\.gemini\antigravity\brain\a2b9ccd9-591d-49f0-95a0-c26b28016873"

# Generated images
Optimize-ImageFile "$brainDir\nothing_4a_white_1793006648918.jpg" "$prodDir\nothing-phone-white.jpg"
Optimize-ImageFile "$brainDir\poco_c85x_green_1793006727190.jpg" "$prodDir\poco-c85x-green.jpg"
Optimize-ImageFile "$brainDir\poco_m8x_blue_1793006738395.jpg" "$prodDir\poco-m8x-blue.jpg"
Optimize-ImageFile "$brainDir\oppo_a6_pro_gold_1793006719301.jpg" "$prodDir\oppo-a6-pro-gold.jpg"
Optimize-ImageFile "$brainDir\oppo_f35_pro_brown_1793006740915.jpg" "$prodDir\oppo-f35-pro-brown.jpg"
Optimize-ImageFile "$brainDir\vivo_t5_lite_twilight_shadow_1793006731740.jpg" "$prodDir\vivo-t5lite-twilight.jpg"
Optimize-ImageFile "$brainDir\vivo_t5_lite_wave_blue_1793006747590.jpg" "$prodDir\vivo-t5lite-blue.jpg"
Optimize-ImageFile "$brainDir\iphone_17_white_1793006712417.jpg" "$prodDir\iphone-17-white.jpg"
Optimize-ImageFile "$brainDir\iphone_17_lavender_1793006746347.jpg" "$prodDir\iphone-17-lavender.jpg"
Optimize-ImageFile "$brainDir\samsung_galaxy_s25_fe_jet_black_v2_png_1793006726195.jpg" "$prodDir\samsung-s25fe-black.jpg"
Optimize-ImageFile "$brainDir\samsung_galaxy_a17_black_with_adapter_png_1793006747075.jpg" "$prodDir\samsung-a17-black.jpg"
