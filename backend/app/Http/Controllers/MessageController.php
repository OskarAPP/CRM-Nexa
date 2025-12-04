<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use App\Models\CredencialWhatsapp;

class MessageController extends Controller
{
    protected string $evolutionBaseUrl;

    public function __construct()
    {
        $this->evolutionBaseUrl = rtrim(config('services.evolution.base_url'), '/');
    }

    public function sendMessage(Request $request)
    {
        $request->validate([
            'numeros' => 'required|array',
            'numeros.*' => ['required', 'string', 'regex:/^\+?\d{8,15}$/'],
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
        $apiUrl = sprintf('%s/message/sendText/%s', $this->evolutionBaseUrl, $instanceName);

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
            'numeros.*' => ['required', 'string', 'regex:/^\+?\d{8,15}$/'],
            'mediatype' => 'required|string',   // image, video, document
            'mimetype' => 'required|string',    // ejemplo: image/png
            'media' => 'required_without:media_file|string|nullable',
            'media_file' => 'required_without:media|file|max:5120', // 5MB
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
        $apiUrl = sprintf('%s/message/sendMedia/%s', $this->evolutionBaseUrl, $instanceName);

        $numeros = $request->numeros;
        $client = new Client();
        $resultados = [];

        $mediaPayload = $request->media;

        if (! $mediaPayload && $request->hasFile('media_file')) {
            $mediaPayload = base64_encode(file_get_contents($request->file('media_file')->getRealPath()));
        }

        foreach ($numeros as $numero) {
            $data = [
                'number' => $numero,
                'mediatype' => $request->mediatype,
                'mimetype' => $request->mimetype,
                'media' => $mediaPayload,
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
