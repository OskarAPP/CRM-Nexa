<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use App\Models\CredencialWhatsapp;

class MessageController extends Controller
{
    public function sendMessage(Request $request)
    {
        $request->validate([
            'numeros' => 'required|array',
            'mensaje' => 'required|string',
        ]);

        $user = $request->user();

        if (! $user) {
            return response()->json([
                'error' => true,
                'message' => 'Usuario no autenticado.'
            ], 401);
        }

        $credencial = CredencialWhatsapp::where('user_id', $user->id)->first();
        if (!$credencial) {
            return response()->json([
                'error' => true,
                'message' => 'No se encontraron credenciales de WhatsApp para el usuario especificado.'
            ], 404);
        }

        $instanceName = $credencial->instancia;
        $apiKey = $credencial->apikey;
        $apiUrl = "https://nexa-evolution-api.yyfvlz.easypanel.host/message/sendText/{$instanceName}";

        $numeros = $request->numeros;
        $mensaje = $request->mensaje;
        $client = new Client();
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

        $user = $request->user();

        if (! $user) {
            return response()->json([
                'error' => true,
                'message' => 'Usuario no autenticado.'
            ], 401);
        }

        $credencial = CredencialWhatsapp::where('user_id', $user->id)->first();
        if (!$credencial) {
            return response()->json([
                'error' => true,
                'message' => 'No se encontraron credenciales de WhatsApp para el usuario especificado.'
            ], 404);
        }

        $instanceName = $credencial->instancia;
        $apiKey = $credencial->apikey;
        $apiUrl = "https://nexa-evolution-api.yyfvlz.easypanel.host/message/sendMedia/{$instanceName}";

        $numeros = $request->numeros;
        $client = new Client();
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
