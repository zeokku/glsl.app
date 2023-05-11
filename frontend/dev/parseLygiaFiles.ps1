$path = "C:\Users\Roman\source\repos\lygia"
$out =  "./parsedLygia.txt"

if(Test-Path $out -PathType Leaf){
    Clear-Content -Path $out
}

Get-ChildItem -Path $path -Recurse -File -Include *.glsl | % {
    $r = $_ | Resolve-Path -Relative
    Add-Content -Path $out -Value $r
    
    # $pathParts = $_.FullName.substring($pwd.path.Length + 1).split("\");
    # if ( ! ($excludeList | where { $pathParts -like $_ } ) ) { $_ }
}