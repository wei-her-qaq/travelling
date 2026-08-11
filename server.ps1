# Majo no Tabitabi HTTP Server
param([int]$Port=8080)
$root=$PSScriptRoot
Add-Type -AssemblyName System.Web
Add-Type -AssemblyName System.IO.Compression.FileSystem

$ips=@(Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred -EA 0|?{$_.IPAddress -notmatch "127\.|169\.254\."}|%{$_.IPAddress})
if($ips.Count -eq 0){$ips=@("127.0.0.1")}

$fw="MajoTabitabi-$Port"
if(!(Get-NetFirewallRule -DisplayName $fw -EA 0)){try{New-NetFirewallRule -DisplayName $fw -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -EA 0|Out-Null}catch{}}
try{netsh http add urlacl url="http://+:$Port/" user=Everyone 2>$null|Out-Null}catch{}

$l=New-Object System.Net.HttpListener
$l.Prefixes.Add("http://+:$Port/")
$l.Start()

$mime=@{}
$mime[".html"]="text/html; charset=utf-8"
$mime[".css"]="text/css; charset=utf-8"
$mime[".js"]="application/javascript; charset=utf-8"
$mime[".json"]="application/json; charset=utf-8"
$mime[".jpg"]="image/jpeg"
$mime[".jpeg"]="image/jpeg"
$mime[".png"]="image/png"
$mime[".gif"]="image/gif"
$mime[".svg"]="image/svg+xml"
$mime[".ico"]="image/x-icon"
$mime[".epub"]="application/epub+zip"
$mime[".woff"]="font/woff"
$mime[".woff2"]="font/woff2"

$booksDir=Join-Path $root "books"
$cache=@{}

function Get-OPF($zip){
  $opf=$zip.Entries|?{$_.FullName -match "\.opf$" -and $_.FullName -notmatch "META-INF"}|select -First 1
  if(!$opf){
    $con=$zip.Entries|?{$_.FullName -eq "META-INF/container.xml"}|select -First 1
    if($con){$s=$con.Open();$r=New-Object IO.StreamReader($s,[Text.Encoding]::UTF8);$x=[xml]$r.ReadToEnd();$r.Close();$s.Close();$rf=$x.container.rootfiles.rootfile."full-path";$opf=$zip.Entries|?{$_.FullName -eq $rf}|select -First 1}
  }
  return $opf
}

function Build-Cache($fn){
  $p=Join-Path $booksDir $fn
  if(!(Test-Path $p)){return $null}
  $zip=$null
  try{
    $zip=[IO.Compression.ZipFile]::OpenRead($p)
    $opf=Get-OPF $zip
    if(!$opf){return $null}
    $s=$opf.Open();$r=New-Object IO.StreamReader($s,[Text.Encoding]::UTF8);$ox=[xml]$r.ReadToEnd();$r.Close();$s.Close()
    $ob=[IO.Path]::GetDirectoryName($opf.FullName);if($ob){$ob=$ob.Replace("\","/")+"/"}
    $ns=New-Object Xml.XmlNamespaceManager($ox.NameTable);$ns.AddNamespace("o","http://www.idpf.org/2007/opf")
    $items=$ox.SelectNodes("//o:manifest/o:item",$ns);$im=@{}
    foreach($it in $items){$im[$it.GetAttribute("id")]=$it.GetAttribute("href")}
    $spine=@()
    foreach($sp in $ox.SelectNodes("//o:spine/o:itemref",$ns)){$h=$im[$sp.GetAttribute("idref")];if($h){$spine+=if($ob){$ob+$h}else{$h}}}
    $toc=@()
    $te=$zip.Entries|?{$_.FullName -match "toc\.ncx$"}|select -First 1
    if($te){$ts=$te.Open();$tr=New-Object IO.StreamReader($ts,[Text.Encoding]::UTF8);$tx=[xml]$tr.ReadToEnd();$tr.Close();$ts.Close();$tns=New-Object Xml.XmlNamespaceManager($tx.NameTable);$tns.AddNamespace("n","http://www.daisy.org/z3986/2005/ncx/");foreach($np in $tx.SelectNodes("//n:navPoint",$tns)){$lb=$np.SelectSingleNode("n:navLabel/n:text",$tns).InnerText;$sr=$np.SelectSingleNode("n:content",$tns).GetAttribute("src");$toc+=@{title=$lb;src=$sr}}}
    $cache[$fn]=@{opfEntry=$opf.FullName;opfBase=$ob;itemMap=$im;spine=$spine;toc=$toc;zipPath=$p}
    $zip.Dispose();$zip=$null
    return $cache[$fn]
  }finally{if($zip){$zip.Dispose()}}
}

function Get-Cache($fn){if(!$cache[$fn]){return Build-Cache $fn};return $cache[$fn]}

function Rewrite-Imgs($html,$base,$zip){
  $sb=New-Object Text.StringBuilder $html.Length
  $i=0
  while($i -lt $html.Length){
    $si=$html.IndexOf('src="',$i)
    if($si -lt 0){$sb.Append($html.Substring($i))|Out-Null;break}
    $sb.Append($html.Substring($i,$si-$i))|Out-Null
    $qe=$html.IndexOf('"',$si+5)
    if($qe -lt 0){$sb.Append($html.Substring($si))|Out-Null;break}
    $p1=$html.Substring($si+5,$qe-$si-5)
    $i=$qe+1
    if($p1.StartsWith("http:") -or $p1.StartsWith("https:") -or $p1.StartsWith("data:")){
      $sb.Append('src="').Append($p1).Append('"')|Out-Null;continue
    }
    $rv=$base+$p1
    $rv=$rv.Replace("/./","/")
    while($rv.IndexOf("/../") -ge 0){$pos=$rv.IndexOf("/../");$prev=$rv.LastIndexOf("/",$pos-1);if($prev -ge 0){$rv=$rv.Substring(0,$prev)+$rv.Substring($pos+4)}else{break}}
    $re=$zip.Entries|?{$_.FullName -eq $rv}|select -First 1
    if(!$re){$fn=[IO.Path]::GetFileName($rv);$re=$zip.Entries|?{$_.FullName -like "*$fn"}|select -First 1}
    if($re){
      $rs=$re.Open();$ms2=New-Object IO.MemoryStream;$rs.CopyTo($ms2);$rs.Close();$ms2.Close()
      $rb=[Convert]::ToBase64String($ms2.ToArray())
      $ext=[IO.Path]::GetExtension($re.Name).ToLower()
      $mt="image/jpeg";if($ext -eq ".png"){$mt="image/png"}elseif($ext -eq ".gif"){$mt="image/gif"}elseif($ext -eq ".svg"){$mt="image/svg+xml"}
      $sb.Append("src=").Append([char]34).Append("data:").Append($mt).Append(";base64,").Append($rb).Append([char]34)|Out-Null
    }else{$sb.Append("src=").Append([char]34).Append($p1).Append([char]34)|Out-Null}
  }
  return $sb.ToString()
}

function Write-Resp($resp,$ct,$bytes){
  $resp.ContentType=$ct
  $resp.AddHeader("Access-Control-Allow-Origin","*")
  if($ct -match "image/"){$resp.AddHeader("Cache-Control","public, max-age=3600")}else{$resp.AddHeader("Cache-Control","no-cache")}
  $resp.OutputStream.Write($bytes,0,$bytes.Length)
  $resp.Close()
}

Write-Host ""
Write-Host "  Majo no Tabitabi Server" -ForegroundColor Magenta
Write-Host "  http://localhost:$Port" -ForegroundColor Green
foreach($ip in $ips){Write-Host "  http://${ip}:$Port" -ForegroundColor Green}
Write-Host "  Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

while($l.IsListening){
  try{$c=$l.GetContext();$req=$c.Request;$resp=$c.Response;$path=$req.Url.AbsolutePath;$resp.AddHeader("Access-Control-Allow-Origin","*");$resp.AddHeader("Access-Control-Allow-Methods","GET, OPTIONS");$resp.AddHeader("Access-Control-Allow-Headers","*");if($req.HttpMethod -eq "OPTIONS"){$resp.StatusCode=204;$resp.Close();continue}

  if($path -eq "/api/books"){
    $bl=@()
    Get-ChildItem -LiteralPath $booksDir -Filter "*.epub"|%{$bn=$_.Name;$base=[IO.Path]::GetFileNameWithoutExtension($bn);$cd=Join-Path $booksDir "covers";$cn=$null;if(Test-Path(Join-Path $cd ($base+".jpg"))){$cn="books/covers/$base.jpg"}elseif(Test-Path(Join-Path $cd ($base+".jpeg"))){$cn="books/covers/$base.jpeg"}elseif(Test-Path(Join-Path $cd ($base+".png"))){$cn="books/covers/$base.png"};$bl+=@{filename=$bn;title=$base;cover=$cn}}
    $js=ConvertTo-Json $bl -Depth 3 -Compress
    Write-Resp $resp "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($js))
    continue
  }

  if($path -match "^/api/book/(.+)/chapters$"){
    $bn=[Web.HttpUtility]::UrlDecode($Matches[1]);$c2=Get-Cache $bn
    if(!$c2){$resp.StatusCode=404;$resp.Close();continue}
    $ch=$c2.toc;if($ch.Count -eq 0){$idx=1;foreach($s in $c2.spine){$ch+=@{title="Chapter $idx";src=$s;id=$idx};$idx++}}
    $js=ConvertTo-Json @{chapters=$ch} -Depth 3 -Compress
    Write-Resp $resp "application/json; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($js))
    continue
  }

  if($path -match "^/api/book/(.+)/chapter/(\d+)$"){
    $bn=[Web.HttpUtility]::UrlDecode($Matches[1]);$idx=[int]$Matches[2];$c2=Get-Cache $bn
    if(!$c2 -or $idx -lt 0 -or $idx -ge $c2.spine.Count){$resp.StatusCode=404;$resp.Close();continue}
    $src=$c2.spine[$idx];$zip=$null
    try{$zip=[IO.Compression.ZipFile]::OpenRead($c2.zipPath);$entry=$zip.Entries|?{$_.FullName -eq $src}|select -First 1;if(!$entry){$fn=[IO.Path]::GetFileName($src);$entry=$zip.Entries|?{$_.FullName -like "*$fn"}|select -First 1};if($entry){$s=$entry.Open();$r=New-Object IO.StreamReader($s,[Text.Encoding]::UTF8);$html=$r.ReadToEnd();$r.Close();$s.Close();$base=[IO.Path]::GetDirectoryName($src);if($base){$base=$base.Replace("\","/")+"/"};$html=Rewrite-Imgs $html $base $zip;Write-Resp $resp "text/html; charset=utf-8" ([Text.Encoding]::UTF8.GetBytes($html))}else{$resp.StatusCode=404;$resp.Close()}}catch{$resp.StatusCode=500;$resp.Close()}finally{if($zip){$zip.Dispose()}}
    continue
  }

  $f=$path.TrimStart("/");if($f -eq ""){$f="index.html"};$fp=Join-Path $root $f
  if($fp.StartsWith($root) -and (Test-Path $fp) -and !(Test-Path $fp -PathType Container)){$ext=[IO.Path]::GetExtension($fp);$ct=if($mime[$ext]){$mime[$ext]}else{"application/octet-stream"};$fs=[IO.File]::OpenRead($fp);$ms=New-Object IO.MemoryStream;$fs.CopyTo($ms);$fs.Close();Write-Resp $resp $ct $ms.ToArray();$rip=$req.RemoteEndPoint.Address.ToString();Write-Host "[$rip] $path" -ForegroundColor DarkGray}else{$resp.StatusCode=404;$resp.Close()}
  }catch{try{$c.Response.Close()}catch{}}
}
$l.Stop();$l.Close()