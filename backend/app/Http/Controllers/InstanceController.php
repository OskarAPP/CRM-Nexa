<?php

namespace App\Http\Controllers;

use App\Models\CredencialWhatsapp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class InstanceController extends Controller
{
    protected string $evolutionBaseUrl;

    public function __construct()
    {
        $this->evolutionBaseUrl = rtrim(config('services.evolution.base_url', 'https://nexa-evolution-api.yyfvlz.easypanel.host'), '/');
    }

    public function connectionState(Request $request, string $instance)
    {
        $requestedInstance = $instance !== null ? trim($instance) : null;
        if ($requestedInstance === '' || in_array($requestedInstance, ['__current__', '_', '-'], true)) {
            $requestedInstance = null;
        }

        $credencial = null;

        if ($requestedInstance) {
            $credencial = CredencialWhatsapp::where('instancia', $requestedInstance)->first();
        }

        $userId = $request->query('user_id') ?? $request->input('user_id');

        if (! $credencial && $userId) {
            $credencial = CredencialWhatsapp::where('user_id', $userId)->first();
        }

        if (! $credencial) {
            return response()->json([
                'message' => 'No se encontraron credenciales asociadas al usuario o instancia proporcionados.',
            ], 404);
        }

        $instanceName = trim($credencial->instancia);

        if ($instanceName === '') {
            return response()->json([
                'message' => 'La credencial asociada no contiene una instancia válida.',
            ], 422);
        }

        try {
            $url = sprintf('%s/instance/connectionState/%s', $this->evolutionBaseUrl, urlencode($instanceName));

            $httpResponse = Http::withHeaders([
                'apikey' => $credencial->apikey,
                'Accept' => 'application/json',
            ])->timeout(15)->get($url);

            $statusCode = $httpResponse->status();

            $decodedResponse = null;
            try {
                $decodedResponse = $httpResponse->json();
            } catch (\Throwable $exception) {
                $decodedResponse = null;
            }

            $payload = $decodedResponse ?? $httpResponse->body();
            $state = $this->resolveConnectionState($payload);

            $body = [
                'ok' => $httpResponse->successful(),
                'http_code' => $statusCode,
                'instance' => $instanceName,
                'state' => $state,
                'payload' => $decodedResponse,
                'raw' => $decodedResponse ? null : $httpResponse->body(),
            ];

            if (! $httpResponse->successful()) {
                $errorMessage = null;

                if (is_array($decodedResponse) && isset($decodedResponse['message'])) {
                    $errorMessage = $decodedResponse['message'];
                } elseif (is_string($payload)) {
                    $errorMessage = trim($payload) !== '' ? trim($payload) : null;
                }

                $body['error'] = $errorMessage;

                $httpStatus = $statusCode >= 400 ? $statusCode : 502;

                return response()->json($body, $httpStatus);
            }

            return response()->json($body, 200);
        } catch (\Throwable $exception) {
            return response()->json([
                'ok' => false,
                'instance' => $instanceName,
                'state' => null,
                'payload' => null,
                'raw' => null,
                'error' => $exception->getMessage(),
            ], 500);
        }
    }

    protected function resolveConnectionState($payload): ?string
    {
        if (is_string($payload)) {
            $trimmed = trim($payload);
            return $trimmed === '' ? null : strtoupper($trimmed);
        }

        if (! is_array($payload)) {
            return null;
        }

        $matcher = function (string $key): bool {
            $normalized = strtolower($key);

            return in_array($normalized, ['state', 'status', 'connectionstate', 'connection_state'], true);
        };

        $candidate = $this->findValueByKeyMatch($payload, $matcher);

        return $candidate ? strtoupper($candidate) : null;
    }

    protected function findValueByKeyMatch($source, callable $matcher): ?string
    {
        if (is_array($source)) {
            foreach ($source as $key => $value) {
                if (is_string($key) && $matcher($key)) {
                    $normalized = $this->normalizeStringCandidate($value);
                    if ($normalized) {
                        return $normalized;
                    }
                }

                if (is_array($value) || is_object($value)) {
                    $nested = $this->findValueByKeyMatch((array) $value, $matcher);
                    if ($nested) {
                        return $nested;
                    }
                }
            }
        }

        return null;
    }

    protected function normalizeStringCandidate($value): ?string
    {
        if (is_string($value)) {
            $trimmed = trim($value);
            return $trimmed === '' ? null : $trimmed;
        }

        if (is_numeric($value)) {
            return (string) $value;
        }

        if (is_array($value) || is_object($value)) {
            $arrayValue = (array) $value;
            foreach (['state', 'status', 'name', 'code', 'value'] as $key) {
                if (isset($arrayValue[$key])) {
                    $nested = $this->normalizeStringCandidate($arrayValue[$key]);
                    if ($nested) {
                        return $nested;
                    }
                }
            }
        }

        return null;
    }
}
