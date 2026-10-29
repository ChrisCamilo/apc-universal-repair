# Writes the Android launcher icons that phones before Android 8 show, which can't read the adaptive icon of
# res/mipmap-anydpi-v26: ic_launcher.png (a rounded square) and ic_launcher_round.png (a circle) in each density, from
# 48px (mdpi) to 192px (xxxhdpi). They draw the APC gauge of apps/web/public/favicon.svg, in its 48-unit grid and its
# colors, as res/drawable/ic_launcher_foreground.xml does. Run it again when the artwork changes; the PNGs are committed.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# Each density's folder and the icon's size in it.
$Densities = [ordered]@{ 'mipmap-mdpi' = 48; 'mipmap-hdpi' = 72; 'mipmap-xhdpi' = 96; 'mipmap-xxhdpi' = 144; 'mipmap-xxxhdpi' = 192 }
$Res = Join-Path $PSScriptRoot '..\android\app\src\main\res'

<#
.SYNOPSIS
Turns a favicon.svg color and opacity into a GDI+ color.
.PARAMETER Hex
The color, e.g. '#E8E6E1'.
.PARAMETER Opacity
Its opacity, from 0 to 1.
.OUTPUTS
The color.
#>
function Get-Color([string]$Hex, [double]$Opacity = 1) {
  $rgb = [Convert]::ToInt32($Hex.TrimStart('#'), 16)
  return [System.Drawing.Color]::FromArgb([int](255 * $Opacity), ($rgb -shr 16) -band 255, ($rgb -shr 8) -band 255, $rgb -band 255)
}

<#
.SYNOPSIS
Draws the APC mark on its plate, a rounded square or a circle, at a size.
.PARAMETER Size
The image's width and height, in px.
.PARAMETER Round
Whether the plate is a circle, for ic_launcher_round.
.OUTPUTS
The image.
#>
function New-Icon([int]$Size, [bool]$Round) {
  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.ScaleTransform($Size / 48, $Size / 48)

  $plate = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($Round) {
    $plate.AddEllipse(2, 2, 44, 44)
  } else {
    $plate.AddArc(2, 2, 20, 20, 180, 90); $plate.AddArc(26, 2, 20, 20, 270, 90)
    $plate.AddArc(26, 26, 20, 20, 0, 90); $plate.AddArc(2, 26, 20, 20, 90, 90)
    $plate.CloseFigure()
  }
  $g.FillPath((New-Object System.Drawing.SolidBrush (Get-Color '#0B0C0E')), $plate)
  $g.DrawPath((New-Object System.Drawing.Pen (Get-Color '#E8E6E1' 0.35), 2), $plate)

  $g.DrawArc((New-Object System.Drawing.Pen (Get-Color '#E8E6E1' 0.6), 3), 10, 16, 28, 28, 180, 180)
  $tick = New-Object System.Drawing.Pen (Get-Color '#E8E6E1'), 2.5
  $g.DrawLine($tick, 10, 30, 14, 30); $g.DrawLine($tick, 24, 16, 24, 20); $g.DrawLine($tick, 34, 30, 38, 30)
  $needle = New-Object System.Drawing.Pen (Get-Color '#FFA31A'), 3.5
  $needle.StartCap = 'Round'; $needle.EndCap = 'Round'
  $g.DrawLine($needle, 24, 30, 32, 21)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush (Get-Color '#FFA31A')), 21, 27, 6, 6)

  $g.Dispose()
  return $bitmap
}

foreach ($density in $Densities.Keys) {
  foreach ($round in $false, $true) {
    $name = if ($round) { 'ic_launcher_round.png' } else { 'ic_launcher.png' }
    $icon = New-Icon $Densities[$density] $round
    $icon.Save((Join-Path $Res "$density\$name"), [System.Drawing.Imaging.ImageFormat]::Png)
    $icon.Dispose()
  }
}
