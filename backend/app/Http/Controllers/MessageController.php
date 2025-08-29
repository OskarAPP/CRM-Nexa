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
                        'apikey' => $apiKey
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

    // Método modificado para enviar medios a múltiples contactos
    public function sendMedia(Request $request)
    {
        $request->validate([
            'numeros' => 'required|array',
            'mediatype' => 'required|string',   // image, video, document
            'mimetype' => 'required|string',    // ejemplo: image/png
            'media' => 'required|string',       // URL o base64
            'fileName' => 'required|string',
            'caption' => 'nullable|string',
            'delay' => 'nullable|integer',
            'linkPreview' => 'nullable|boolean'
        ]);

        $numeros = $request->numeros;
        $client = new Client();
        $apiUrl = 'https://nexa-evolution-api.yyfvlz.easypanel.host/message/sendMedia/Chalino';
        $apiKey = '5CB5FA7385FE-4BEB-92BD-B8BC1EB841AA';

        $resultados = [];

        foreach ($numeros as $numero) {
            $data = [
                'number' => $numero,
                'mediatype' => $request->mediatype,
                'mimetype' => $request->mimetype,
                'media' => $request->media,
                'fileName' => $request->fileName,
                'caption' => $request->caption ?? '',
                'delay' => $request->delay ?? 0,
                'linkPreview' => $request->linkPreview ?? false
            ];

            try {
                $response = $client->post($apiUrl, [
                    'headers' => [
                        'Content-Type' => 'application/json',
                        'apikey' => $apiKey
                    ],
                    'json' => $data
                ]);

                $body = json_decode($response->getBody(), true);
                $statusCode = $response->getStatusCode();

                $resultados[] = [
                    'numero' => $numero,
                    'status' => $body['status'] ?? 'UNKNOWN',
                    'id' => $body['key']['id'] ?? null,
                    'http_code' => $statusCode,
                    'message' => $body['message'] ?? null
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