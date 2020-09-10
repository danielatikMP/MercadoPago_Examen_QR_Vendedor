<?php

// Crear una orden

header('Content-type: application/json');

include_once '../../global/functions.php';
global $access_token,$collector_id;

 $external_id = $_POST["external_id"];
 $external_store_id = $_POST["external_store_id"];
 $json = $_POST["json"];

 // REVISA AQUÍ:
 // Qué método y endpoint de la API de Mercado Pago deberías poner aquí para poder crear una orden
 // en base al external_id, external_store_id, collector_id y Json recibidos
 // Sustituye el método por su correspondiente: get, put, post, delete
 $url = "";

curl_call("MÉTODO","$url?access_token=$access_token",$json);

?>
