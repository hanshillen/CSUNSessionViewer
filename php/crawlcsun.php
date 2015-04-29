<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
</head>
<body>
<?php
    
    $file = "http://www.csun.edu/cod/conference/2015/sessions/index.php/public/conf_sessions/";
    $fp = fopen ($file, "r");
    if (!$fp) {
        die ("Doei!");   
    }

while (!feof ($fp)) {
    $line = fgets ($fp, 1024);
    /* This only works if the title and its tags are on one line */
    if (preg_match ("@\<title\>(.*)\</title\>@i", $line, $out)) {
        $title = $out[1];
        break;
    }
}
echo $title;
fclose($fp);

?>
</body>
</html>


<? 

?>