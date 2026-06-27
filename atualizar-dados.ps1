param(
    [string]$ExcelPath = "",
    [string]$OutputPath = "dados.js"
)

$ErrorActionPreference = "Stop"

function Read-ZipText {
    param(
        [System.IO.Compression.ZipArchive]$Zip,
        [string]$EntryName
    )

    $entry = $Zip.GetEntry($EntryName)
    if (-not $entry) {
        throw "Arquivo interno nao encontrado no xlsx: $EntryName"
    }

    $reader = [System.IO.StreamReader]::new($entry.Open(), [System.Text.Encoding]::UTF8)
    try {
        return $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }
}

function Normalize-Text {
    param($Value)

    $text = [string]$Value
    $normalized = $text.Normalize([Text.NormalizationForm]::FormD)
    $builder = [Text.StringBuilder]::new()

    foreach ($char in $normalized.ToCharArray()) {
        $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
        if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$builder.Append($char)
        }
    }

    return $builder.ToString().Trim().ToLowerInvariant()
}

function Includes-Normalized {
    param($Value, [string]$Search)

    return (Normalize-Text $Value).Contains((Normalize-Text $Search))
}

function Convert-ColToIndex {
    param([string]$CellRef)

    $letters = ([regex]::Match($CellRef, "^[A-Z]+")).Value
    $index = 0
    foreach ($char in $letters.ToCharArray()) {
        $index = ($index * 26) + ([int][char]$char - [int][char]'A' + 1)
    }

    return $index - 1
}

function Convert-ToNumber {
    param($Value)

    if ($null -eq $Value) { return 0 }
    if ($Value -is [int] -or $Value -is [double] -or $Value -is [decimal]) {
        return [int]$Value
    }

    $number = 0.0
    if ([double]::TryParse([string]$Value, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
        return [int]$number
    }

    return 0
}

function Normalize-Result {
    param($Value)

    if ($null -eq $Value) { return "F" }

    $text = ([string]$Value).Trim()
    if ($text -eq "") { return "F" }
    if ($text.ToUpperInvariant() -eq "F") { return "F" }

    $number = 0.0
    if ([double]::TryParse($text, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
        return [int]$number
    }

    return "F"
}

function Test-Filled {
    param($Value)

    return $null -ne $Value -and ([string]$Value).Trim() -ne ""
}

function Test-PlayerRow {
    param($Row)

    if (-not $Row -or $Row.Count -lt 3) { return $false }

    $name = ([string]$Row[1]).Trim()
    if ($name -eq "") { return $false }
    if (Includes-Normalized $name "goleiros") { return $false }
    if (Includes-Normalized $name "atletas") { return $false }
    if (Includes-Normalized $name "artilharia") { return $false }

    $number = 0.0
    return [double]::TryParse([string]$Row[2], [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)
}

function Find-Row {
    param(
        [object[]]$Rows,
        [int]$StartIndex,
        [scriptblock]$Predicate
    )

    for ($i = [Math]::Max($StartIndex, 0); $i -lt $Rows.Count; $i++) {
        if (& $Predicate $Rows[$i]) {
            return $i
        }
    }

    return -1
}

function Get-ActiveHistoryLength {
    param([object[]]$DataRows)

    $firstRoundCol = 8
    $max = 0

    foreach ($row in $DataRows) {
        if (-not (Test-PlayerRow $row)) { continue }

        for ($col = $row.Count - 1; $col -ge $firstRoundCol; $col--) {
            if (Test-Filled $row[$col]) {
                $max = [Math]::Max($max, $col - $firstRoundCol + 1)
                break
            }
        }
    }

    return $max
}

function Read-History {
    param(
        $Row,
        [int]$Length
    )

    $firstRoundCol = 8
    $history = @()
    for ($i = 0; $i -lt $Length; $i++) {
        $history += Normalize-Result $Row[$firstRoundCol + $i]
    }

    return @($history)
}

function Parse-Block {
    param(
        [object[]]$Rows,
        [int]$HeaderIndex,
        [int]$EndIndex,
        [string]$TotalKey = "pontos"
    )

    $dataRows = @($Rows[($HeaderIndex + 1)..($EndIndex - 1)])
    $activeLength = Get-ActiveHistoryLength $dataRows
    $players = @()

    foreach ($row in $dataRows) {
        if (-not (Test-PlayerRow $row)) { continue }

        $player = [ordered]@{
            nome = ([string]$row[1]).Trim()
            jogos = Convert-ToNumber $row[7]
            historico = @(Read-History $row $activeLength)
        }
        $player.Insert(1, $TotalKey, (Convert-ToNumber $row[2]))

        $players += [pscustomobject]$player
    }

    return @($players)
}

function Get-PlayerKey {
    param([string]$Name)
    return Normalize-Text $Name
}

function Get-Destaque {
    param([object[]]$Artilharia)

    $maxLength = 0
    foreach ($player in $Artilharia) {
        $maxLength = [Math]::Max($maxLength, $player.historico.Count)
    }

    for ($round = $maxLength - 1; $round -ge 0; $round--) {
        $candidates = @()
        foreach ($player in $Artilharia) {
            $value = $player.historico[$round]
            if ($value -is [int]) {
                $candidates += [pscustomobject]@{
                    nome = $player.nome
                    gols = $value
                    jogos = $player.jogos
                    rodada = $round + 1
                }
            }
        }

        if ($candidates.Count -gt 0) {
            return $candidates | Sort-Object @{Expression = "gols"; Descending = $true}, @{Expression = "nome"; Descending = $false} | Select-Object -First 1
        }
    }

    return $null
}

$excelFile = $null
if ([string]::IsNullOrWhiteSpace($ExcelPath)) {
    $excelFile = Get-ChildItem -File -Filter "*.xlsx" |
        Sort-Object @{ Expression = { if ($_.Name -match "2026") { 0 } else { 1 } } }, LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $excelFile) {
        throw "Nenhuma planilha .xlsx foi encontrada nesta pasta."
    }

    $excelFullPath = $excelFile.FullName
}
else {
    $excelFullPath = [IO.Path]::GetFullPath((Join-Path (Get-Location) $ExcelPath))
}

if (-not (Test-Path -LiteralPath $excelFullPath)) {
    throw "Planilha nao encontrada: $excelFullPath"
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($excelFullPath)

try {
    [xml]$workbook = Read-ZipText $zip "xl/workbook.xml"
    [xml]$relationships = Read-ZipText $zip "xl/_rels/workbook.xml.rels"

    $workbookNs = [Xml.XmlNamespaceManager]::new($workbook.NameTable)
    $workbookNs.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")
    $workbookNs.AddNamespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")

    $relsNs = [Xml.XmlNamespaceManager]::new($relationships.NameTable)
    $relsNs.AddNamespace("rel", "http://schemas.openxmlformats.org/package/2006/relationships")

    $sheetInfo = @()
    foreach ($sheetNode in $workbook.SelectNodes("//m:sheet", $workbookNs)) {
        $rid = $sheetNode.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
        $relationship = $relationships.SelectSingleNode("//rel:Relationship[@Id='$rid']", $relsNs)
        $yearMatch = [regex]::Match($sheetNode.name, "\d{4}")
        $year = if ($yearMatch.Success) { [int]$yearMatch.Value } else { 0 }
        $sheetInfo += [pscustomobject]@{
            Name = $sheetNode.name
            Target = $relationship.Target.TrimStart("/")
            Year = $year
        }
    }

    $selectedSheet = $sheetInfo | Sort-Object @{Expression = "Year"; Descending = $true}, @{Expression = "Name"; Descending = $true} | Select-Object -First 1
    $sheetEntry = "xl/$($selectedSheet.Target)"

    [xml]$sharedStringsXml = Read-ZipText $zip "xl/sharedStrings.xml"
    $sharedStringsNs = [Xml.XmlNamespaceManager]::new($sharedStringsXml.NameTable)
    $sharedStringsNs.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

    $sharedStrings = @()
    foreach ($si in $sharedStringsXml.SelectNodes("//m:si", $sharedStringsNs)) {
        $parts = @()
        foreach ($textNode in $si.SelectNodes(".//m:t", $sharedStringsNs)) {
            $parts += $textNode.InnerText
        }
        $sharedStrings += ($parts -join "")
    }

    [xml]$sheetXml = Read-ZipText $zip $sheetEntry
    $sheetNs = [Xml.XmlNamespaceManager]::new($sheetXml.NameTable)
    $sheetNs.AddNamespace("m", "http://schemas.openxmlformats.org/spreadsheetml/2006/main")

    $rows = @()
    foreach ($rowNode in $sheetXml.SelectNodes("//m:sheetData/m:row", $sheetNs)) {
        $row = @()
        foreach ($cellNode in $rowNode.SelectNodes("m:c", $sheetNs)) {
            $colIndex = Convert-ColToIndex $cellNode.r
            while ($row.Count -le $colIndex) {
                $row += $null
            }

            $valueNode = $cellNode.SelectSingleNode("m:v", $sheetNs)
            if (-not $valueNode) { continue }

            if ($cellNode.t -eq "s") {
                $row[$colIndex] = $sharedStrings[[int]$valueNode.InnerText]
            }
            else {
                $number = 0.0
                if ([double]::TryParse($valueNode.InnerText, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
                    $row[$colIndex] = [int]$number
                }
                else {
                    $row[$colIndex] = $valueNode.InnerText
                }
            }
        }
        $rows += ,$row
    }

    $pontosHeader = Find-Row $rows 0 { param($row) (Normalize-Text $row[1]) -eq "atletas" -and (Includes-Normalized $row[2] "pontuacao") }
    $goleirosHeader = Find-Row $rows ($pontosHeader + 1) { param($row) Includes-Normalized $row[1] "goleiros" }
    $artilhariaTitle = Find-Row $rows ($goleirosHeader + 1) { param($row) Includes-Normalized $row[1] "artilharia" }
    $golsHeader = Find-Row $rows ($artilhariaTitle + 1) { param($row) (Normalize-Text $row[1]) -eq "atletas" -and (Includes-Normalized $row[2] "gols") }
    $goleirosGolsHeader = Find-Row $rows ($golsHeader + 1) { param($row) Includes-Normalized $row[1] "goleiros" }

    if (@($pontosHeader, $goleirosHeader, $artilhariaTitle, $golsHeader, $goleirosGolsHeader) -contains -1) {
        throw "Formato da planilha nao reconhecido."
    }

    $classificacaoBase = Parse-Block $rows $pontosHeader $goleirosHeader "pontos"
    $goleirosBase = Parse-Block $rows $goleirosHeader $artilhariaTitle "pontos"
    $artilharia = Parse-Block $rows $golsHeader $goleirosGolsHeader "gols"
    $artilhariaGoleiros = Parse-Block $rows $goleirosGolsHeader $rows.Count "gols"

    $golsPorNome = @{}
    foreach ($player in $artilharia) {
        $golsPorNome[(Get-PlayerKey $player.nome)] = $player
    }

    $golsGoleirosPorNome = @{}
    foreach ($player in $artilhariaGoleiros) {
        $golsGoleirosPorNome[(Get-PlayerKey $player.nome)] = $player
    }

    $classificacao = @()
    foreach ($player in $classificacaoBase) {
        $key = Get-PlayerKey $player.nome
        $gols = if ($golsPorNome.ContainsKey($key)) { $golsPorNome[$key].gols } else { 0 }
        $classificacao += [pscustomobject][ordered]@{
            nome = $player.nome
            pontos = $player.pontos
            jogos = $player.jogos
            historico = @($player.historico)
            gols = $gols
        }
    }

    foreach ($player in $artilharia) {
        $key = Get-PlayerKey $player.nome
        $exists = $false
        foreach ($existing in $classificacao) {
            if ((Get-PlayerKey $existing.nome) -eq $key) {
                $exists = $true
                break
            }
        }
        if ($exists) { continue }

        $fallbackHistory = @()
        foreach ($value in $player.historico) {
            $fallbackHistory += $(if ($value -eq "F") { "F" } else { 0 })
        }

        $classificacao += [pscustomobject][ordered]@{
            nome = $player.nome
            pontos = 0
            jogos = $player.jogos
            historico = @($fallbackHistory)
            gols = $player.gols
        }
    }

    $goleiros = @()
    foreach ($player in $goleirosBase) {
        $key = Get-PlayerKey $player.nome
        $gols = if ($golsGoleirosPorNome.ContainsKey($key)) { $golsGoleirosPorNome[$key].gols } else { 0 }
        $goleiros += [pscustomobject][ordered]@{
            nome = $player.nome
            pontos = $player.pontos
            jogos = $player.jogos
            historico = @($player.historico)
            gols = $gols
        }
    }

    $rodadaAtual = 0
    foreach ($player in @($classificacao + $goleiros)) {
        $rodadaAtual = [Math]::Max($rodadaAtual, $player.historico.Count)
    }

    $dados = [pscustomobject][ordered]@{
        classificacao = @($classificacao)
        goleiros = @($goleiros)
        meta = [pscustomobject][ordered]@{
            aba = $selectedSheet.Name
            rodadaAtual = $rodadaAtual
            destaque = Get-Destaque $artilharia
        }
    }

    $json = $dados | ConvertTo-Json -Depth 50
    $js = "var DADOS = $json;`r`n"
    $outputFullPath = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
    [IO.File]::WriteAllText($outputFullPath, $js, [Text.UTF8Encoding]::new($false))

    Write-Host "dados.js atualizado com a aba $($selectedSheet.Name)."
    Write-Host "Atletas: $($classificacao.Count) | Goleiros: $($goleiros.Count) | Rodada: $rodadaAtual"
}
finally {
    $zip.Dispose()
}
