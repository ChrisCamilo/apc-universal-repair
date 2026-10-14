# Writes build/icon.ico from build/icon.png: the APC gauge at 16, 24, 32, 48, 64, 128 and 256px, each drawn down from
# the 512px artwork with high-quality resampling, so Windows picks a sharp one for the taskbar, the title bar, Alt+Tab
# and the installer. The 256px image is kept as PNG and the smaller ones as 32-bit bitmaps, which every reader of icons
# takes. Run it again when the artwork changes; the .ico is committed.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# The sizes Windows asks an app's icon for.
$Sizes = 16, 24, 32, 48, 64, 128, 256

<#
.SYNOPSIS
Turns a square image into an icon's 32-bit bitmap: its header, the pixels from the bottom row up, and an empty mask.
.PARAMETER Bitmap
The image.
.OUTPUTS
The bytes for the .ico.
#>
function ConvertTo-IconBitmap([System.Drawing.Bitmap]$Bitmap) {
  $size = $Bitmap.Width
  $data = $Bitmap.LockBits((New-Object System.Drawing.Rectangle 0, 0, $size, $size), 'ReadOnly', 'Format32bppArgb')
  $pixels = New-Object byte[] ($size * $size * 4)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $pixels, 0, $pixels.Length)
  $Bitmap.UnlockBits($data)
  # The mask has a bit per pixel, its rows padded to 4 bytes; all zero, since the alpha decides.
  $maskBytes = [Math]::Ceiling($size / 32) * 4 * $size
  $out = New-Object System.IO.MemoryStream
  $writer = New-Object System.IO.BinaryWriter $out
  # BITMAPINFOHEADER: the height counts the pixels and the mask.
  $writer.Write([UInt32]40); $writer.Write([Int32]$size); $writer.Write([Int32]($size * 2))
  $writer.Write([UInt16]1); $writer.Write([UInt16]32); $writer.Write([UInt32]0)
  $writer.Write([UInt32]($pixels.Length + $maskBytes)); $writer.Write([Int32]0); $writer.Write([Int32]0)
  $writer.Write([UInt32]0); $writer.Write([UInt32]0)
  for ($row = $size - 1; $row -ge 0; $row--) { $writer.Write($pixels, $row * $size * 4, $size * 4) }
  $writer.Write((New-Object byte[] $maskBytes))
  $writer.Flush()
  return , $out.ToArray()
}

$build = Join-Path (Split-Path -Parent $PSScriptRoot) 'build'
$source = [System.Drawing.Image]::FromFile((Join-Path $build 'icon.png'))
$images = foreach ($size in $Sizes) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.DrawImage($source, 0, 0, $size, $size)
  $graphics.Dispose()
  if ($size -ge 256) {
    $stream = New-Object System.IO.MemoryStream
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $stream.ToArray()
  } else {
    $bytes = ConvertTo-IconBitmap $bitmap
  }
  $bitmap.Dispose()
  , $bytes
}
$source.Dispose()

# The .ico: a 6-byte header, a 16-byte entry per image, then the images, each a PNG.
$out = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $out
$writer.Write([UInt16]0); $writer.Write([UInt16]1); $writer.Write([UInt16]$Sizes.Count)
$offset = 6 + 16 * $Sizes.Count
for ($i = 0; $i -lt $Sizes.Count; $i++) {
  # 256 is written as 0.
  $side = if ($Sizes[$i] -ge 256) { 0 } else { $Sizes[$i] }
  $writer.Write([byte]$side); $writer.Write([byte]$side); $writer.Write([byte]0); $writer.Write([byte]0)
  $writer.Write([UInt16]1); $writer.Write([UInt16]32)
  $writer.Write([UInt32]$images[$i].Length); $writer.Write([UInt32]$offset)
  $offset += $images[$i].Length
}
foreach ($image in $images) { $writer.Write($image) }
$writer.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $build 'icon.ico'), $out.ToArray())
Write-Host "build\icon.ico: $($Sizes -join ', ') px"
