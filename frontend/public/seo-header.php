<?php
$lang = explode('-', $_GET['lang'] ?? 'en')[0];
$localization = [
    'en' => [
        "Online WebGL (GLSL) Shaders Editor and Playground",
        "Modern Online WebGL (GLSL) Shaders Editor and Playground. Write shaders with ease thanks to advanced IntelliSense, autocompletion features, composability with shader libraries and a user-friendly interface for tweaking values and colors"
    ],
    'ru' => [
        "Онлайн WebGL (GLSL) Редактор Шейдеров и Песочница",
        "Современный онлайн-редактор и песочница шейдеров WebGL (GLSL). Создавайте шейдеры легко благодаря продвинутой поддержке IntelliSense, функциям автодополнения, возможности компоновки с библиотеками шейдеров и удобному интерфейсу для настройки значений и цветов",
    ],
    'de' => [
        "Online WebGL (GLSL) Shader-Editor und Spielplatz",
        "Moderner Online WebGL (GLSL) Shader-Editor und Spielplatz. Einfaches Schreiben von Shadern dank fortschrittlichem IntelliSense, Autovervollständigung, Kompatibilität mit Shader-Bibliotheken und einer benutzerfreundlichen Oberfläche zum Anpassen von Werten und Farben",
    ],
    'zh' => [
        "在线 WebGL (GLSL) 着色器编辑器和沙箱",
        "现代在线 WebGL (GLSL) 着色器编辑器和沙箱。 借助先进的 IntelliSense、自动完成、着色器库的可组合性以及用于调整值和颜色的用户友好界面，轻松编写着色器"
    ]
];

if (!array_key_exists($lang, $localization)) {
    $lang = 'en';
}

[$title, $desc] = $localization[$lang];
