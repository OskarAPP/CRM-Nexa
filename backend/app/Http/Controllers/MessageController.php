<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;

class MessageController extends Controller
{
    public function sendMessage(Request $request)
    {
        $request->validate([
            'numeros' => 'required|array',
            'mensaje' => 'required|string',
        ]);

        $numeros = $request->numeros;
        $mensaje = $request->mensaje;

        $client = new Client();
        $apiUrl = 'https://nexa-evolution-api.yyfvlz.easypanel.host/message/sendText/Chalino';

        // <-- API Key directamente en el código
        $apiKey = '5CB5FA7385FE-4BEB-92BD-B8BC1EB841AA';

        $resultados = [];

        foreach ($numeros as $numero) {
            $data = [
                'number' => $numero,
                'text' => $mensaje,
                'delay' => 1000,
                'linkPreview' => false
            ];

            try {
                $response = $client->post($apiUrl, [
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'apikey' => $apiKey  // usando la cabecera que pide Evolution API
                    ],
                    'json' => $data
                ]);

                $body = json_decode($response->getBody(), true);
                $statusCode = $response->getStatusCode();

                $resultados[] = [
                    'numero' => $numero,
                    'status' => $body['status'] ?? 'UNKNOWN',
                    'id' => $body['key']['id'] ?? null,
                    'http_code' => $statusCode
                ];

            } catch (\Exception $e) {
                $resultados[] = [
                    'numero' => $numero,
                    'status' => 'ERROR',
                    'error' => $e->getMessage()
                ];
            }
        }

        return response()->json($resultados);
    }
}