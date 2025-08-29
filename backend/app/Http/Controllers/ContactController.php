<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;

class ContactController extends Controller
{
    public function findContacts(Request $request)
    {
        $instanceName = "Chalino"; // 👈 Cambia el nombre de tu instancia
        $apiKey = "5CB5FA7385FE-4BEB-92BD-B8BC1EB841AA"; // 👈 Tu API Key
        $apiUrl = "https://nexa-evolution-api.yyfvlz.easypanel.host/chat/findContacts/{$instanceName}";

        try {
            $client = new Client();

            $response = $client->post($apiUrl, [
                'headers' => [
                    'apikey' => $apiKey,
                    'Accept' => 'application/json'
                ],
                'json' => [
                    "where" => (object)[] // 👈 Si la API necesita filtros, aquí los agregas
                ]
            ]);

            $data = json_decode($response->getBody(), true);

            return response()->json($data);

        } catch (\Exception $e) {
            return response()->json([
                "error" => true,
                "message" => $e->getMessage()
            ], 500);
        }
    }
}