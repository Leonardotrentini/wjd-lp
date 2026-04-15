<?php
declare(strict_types=1);

/**
 * Roteador WhatsApp em sequência (1 → 2 → 3 → 1 …) para todos os visitantes.
 * Contador em ficheiro com flock() — adequado a hosting PHP com pasta gravável.
 *
 * ?format=json — resposta JSON (para lead-router.js).
 */

$links = [
    'https://wa.me/5547997551198?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20em%20ATACADO!%20',
    'https://wa.me/5547997027389?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!',
    'https://wa.me/5547997551198?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!',
];

$dataDir = __DIR__ . '/data';
$counterFile = $dataDir . '/wa_counter.txt';

if (!is_dir($dataDir)) {
    if (!mkdir($dataDir, 0755, true) && !is_dir($dataDir)) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        exit('Não foi possível criar a pasta data/. Verifica permissões do servidor.');
    }
}

$fp = fopen($counterFile, 'c+');
if ($fp === false) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    exit('Não foi possível abrir o ficheiro do contador.');
}

flock($fp, LOCK_EX);
$raw = stream_get_contents($fp);
$trim = trim((string) $raw);
$n = ctype_digit($trim) ? (int) $trim : 0;
$n++;
rewind($fp);
ftruncate($fp, 0);
fwrite($fp, (string) $n);
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

$count = count($links);
$index = (int) (($n - 1) % $count);
$url = $links[$index];

$wantJson = isset($_GET['format']) && $_GET['format'] === 'json';

header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

if ($wantJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(
        ['pool' => 'server', 'url' => $url, 'sequence' => $index + 1],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

header('Location: ' . $url, true, 302);
exit;
