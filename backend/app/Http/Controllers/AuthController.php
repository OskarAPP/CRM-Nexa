<?php

namespace App\Http\Controllers;

use App\Models\CredencialWhatsapp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;

class AuthController extends Controller
{
    protected string $evolutionBaseUrl;

    public function __construct()
    {
        $this->evolutionBaseUrl = rtrim(config('services.evolution.base_url', 'https://nexa-evolution-api.yyfvlz.easypanel.host'), '/');
    }

    // Registro de usuario
    public function register(Request $request)
    {
        $data = $request->validate([
            'nombres' => 'required|string|max:255',
            'apellidos' => 'required|string|max:255',
            'numero_telefonico' => 'required|string|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', 'min:12', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/', 'confirmed'],
            'estado' => 'required|string|max:100',
            'municipio' => 'required|string|max:100',
            'direccion' => 'required|string',
        ]);

        $user = User::create([
            'nombres' => $data['nombres'],
            'apellidos' => $data['apellidos'],
            'numero_telefonico' => $data['numero_telefonico'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'estado' => $data['estado'],
            'municipio' => $data['municipio'],
            'direccion' => $data['direccion'],
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Usuario registrado correctamente',
            'user' => $user->makeHidden(['password']),
        ], 201);
    }

    // Login con sesión y consulta de credenciales WhatsApp
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Credenciales inválidas'
            ], 401);
        }

        $request->session()->regenerate();

        $user = $request->user();

        $credencial = $user
            ? CredencialWhatsapp::where('user_id', $user->id)->first()
            : null;

        $whatsappSession = null;

        if ($credencial) {
            $connectResponse = $this->requestEvolutionConnect($credencial);
            $statusResponse = $this->requestEvolutionStatus($credencial);

            $whatsappSession = $this->buildWhatsappPayload($connectResponse, $statusResponse);

            $credencial->makeHidden(['instancia', 'apikey']);
        }

        return response()->json([
            'message' => 'Inicio de sesión correcto',
            'user' => $user ? $user->makeHidden(['password']) : null,
            'credencial_whatsapp' => $credencial,
            'whatsapp_session' => $whatsappSession,
            'whatsapp_api_response' => $whatsappSession,
        ], 200);
    }

    // Cerrar sesión con logout de WhatsApp
    public function logout(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $whatsappResponse = null;
        $credencial = CredencialWhatsapp::where('user_id', $user->id)->first();

        if ($credencial) {
            $logoutResponse = $this->performEvolutionRequest(
                "/instance/logout/{$credencial->instancia}",
                $credencial->apikey,
                'DELETE'
            );

            $responseData = $logoutResponse['data'];
            if (is_array($responseData)) {
                $responseData = $this->sanitizeEvolutionPayload($responseData);
            }

            $whatsappResponse = [
                'status_ok' => $logoutResponse['ok'],
                'http_code' => $logoutResponse['status'],
                'response' => $responseData,
                'error' => $logoutResponse['error'] ?? null,
            ];

            $credencial->makeHidden(['instancia', 'apikey']);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logout realizado correctamente',
            'credencial_whatsapp' => $credencial,
            'whatsapp_api_response' => $whatsappResponse
        ], 200);
    }

    public function whatsappStatus(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $credencial = CredencialWhatsapp::where('user_id', $user->id)->first();

        if (! $credencial) {
            return response()->json([
                'message' => 'No existen credenciales de WhatsApp registradas para el usuario'
            ], 404);
        }

        $statusResponse = $this->requestEvolutionStatus($credencial);
        $statusData = is_array($statusResponse['data'] ?? null) ? $statusResponse['data'] : null;
        $statusState = $this->resolveInstanceState(null, $statusData);
        $isConnected = $this->stateMeansConnected($statusState);

        $refreshQr = filter_var(
            $request->query('refresh_qr', false),
            FILTER_VALIDATE_BOOLEAN,
            FILTER_NULL_ON_FAILURE
        );
        $refreshQr = $refreshQr ?? false;

        $connectResponse = null;
        if ($refreshQr || ! $isConnected) {
            $connectResponse = $this->requestEvolutionConnect($credencial);
        }

        $session = $this->buildWhatsappPayload($connectResponse, $statusResponse);

        $credencial->makeHidden(['instancia', 'apikey']);

        $httpCode = $session['connected'] ? 200 : 202;

        return response()->json([
            'message' => 'Estado de WhatsApp consultado correctamente',
            'credencial_whatsapp' => $credencial,
            'whatsapp_session' => $session,
            'whatsapp_api_response' => $session,
        ], $httpCode);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        return response()->json([
            'user' => $user->makeHidden(['password'])
        ], 200);
    }

    protected function requestEvolutionConnect(CredencialWhatsapp $credencial): array
    {
        return $this->performEvolutionRequest(
            "/instance/connect/{$credencial->instancia}",
            $credencial->apikey
        );
    }

    protected function requestEvolutionStatus(CredencialWhatsapp $credencial): array
    {
        return $this->performEvolutionRequest(
            "/instance/status/{$credencial->instancia}",
            $credencial->apikey
        );
    }

    protected function performEvolutionRequest(string $endpoint, string $apiKey, string $method = 'GET', array $payload = []): array
    {
        $url = $this->evolutionBaseUrl . $endpoint;

        try {
            $request = Http::withHeaders([
                'apikey' => $apiKey,
                'Accept' => 'application/json',
            ])->timeout(15);

            $method = strtoupper($method);

            switch ($method) {
                case 'POST':
                    $response = $request->post($url, $payload);
                    break;
                case 'PUT':
                    $response = $request->put($url, $payload);
                    break;
                case 'DELETE':
                    $response = $request->delete($url, $payload);
                    break;
                default:
                    $response = $request->get($url, $payload);
                    break;
            }

            $responseData = null;

            try {
                $responseData = $response->json();
            } catch (\Throwable $exception) {
                $responseData = null;
            }

            $errorMessage = null;
            if (! $response->successful()) {
                if (is_array($responseData) && isset($responseData['message'])) {
                    $errorMessage = $responseData['message'];
                } else {
                    $errorMessage = $response->body();
                }
            }

            return [
                'ok' => $response->successful(),
                'status' => $response->status(),
                'data' => $responseData,
                'body' => $response->body(),
                'error' => $errorMessage,
            ];
        } catch (\Throwable $exception) {
            return [
                'ok' => false,
                'status' => null,
                'data' => null,
                'body' => null,
                'error' => $exception->getMessage(),
            ];
        }
    }

    protected function normalizeEvolutionResult(?array $result): array
    {
        return [
            'ok' => $result['ok'] ?? false,
            'status' => $result['status'] ?? null,
            'data' => $result['data'] ?? null,
            'error' => $result['error'] ?? null,
            'body' => $result['body'] ?? null,
        ];
    }

    protected function buildWhatsappPayload(?array $connectResponse, ?array $statusResponse): array
    {
        $connect = $this->normalizeEvolutionResult($connectResponse ?? []);
        $status = $this->normalizeEvolutionResult($statusResponse ?? []);

        $connectData = is_array($connect['data']) ? $this->sanitizeEvolutionPayload($connect['data']) : $connect['data'];
        $statusData = is_array($status['data']) ? $this->sanitizeEvolutionPayload($status['data']) : $status['data'];

        $state = $this->resolveInstanceState(
            is_array($connectData) ? $connectData : null,
            is_array($statusData) ? $statusData : null
        );

        $connected = $this->stateMeansConnected($state);

        $qrBase64 = null;
        if (! $connected && is_array($connectData)) {
            $qrBase64 = $this->extractQrBase64($connectData);
        }

        $errors = array_filter([
            'connect' => $connect['error'],
            'status' => $status['error'],
        ]);

        return [
            'state' => $state,
            'connected' => $connected,
            'base64' => $qrBase64,
            'data_url' => $qrBase64 ? $this->formatQrDataUrl($qrBase64) : null,
            'connect_ok' => $connect['ok'],
            'status_ok' => $status['ok'],
            'http_code' => [
                'connect' => $connect['status'],
                'status' => $status['status'],
            ],
            'errors' => empty($errors) ? null : $errors,
            'connect_response' => $connectData,
            'status_response' => $statusData,
            'fetched_at' => now()->toIso8601String(),
        ];
    }

    protected function sanitizeEvolutionPayload(array $payload): array
    {
        $clean = $payload;

        Arr::forget($clean, [
            'apikey',
            'apiKey',
            'api_key',
            'token',
            'session',
            'sessionToken',
            'instance.apikey',
            'instance.apiKey',
            'credentials.apikey',
            'credentials.apiKey',
            'credentials.token',
        ]);

        return $clean;
    }

    protected function extractQrBase64(array $data): ?string
    {
        $paths = [
            'data.qr.base64',
            'data.qrBase64',
            'data.base64',
            'data.qrCode',
            'qr.base64',
            'qrCode.base64',
            'qrCode.data',
            'qrCode',
            'qr',
            'base64',
            'image',
            'payload.qr.base64',
            'payload.base64',
        ];

        foreach ($paths as $path) {
            $value = data_get($data, $path);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        $images = data_get($data, 'images');
        if (is_array($images)) {
            foreach ($images as $image) {
                if (is_string($image) && trim($image) !== '') {
                    return trim($image);
                }
                if (is_array($image)) {
                    $nested = $this->extractQrBase64($image);
                    if ($nested) {
                        return $nested;
                    }
                }
            }
        }

        $payload = data_get($data, 'payload');
        if (is_array($payload)) {
            $nested = $this->extractQrBase64($payload);
            if ($nested) {
                return $nested;
            }
        }

        return null;
    }

    protected function formatQrDataUrl(string $raw): string
    {
        $trimmed = trim($raw);

        if (str_starts_with($trimmed, 'data:')) {
            [$meta, $data] = explode(',', $trimmed, 2);
            if ($data === null) {
                return $trimmed;
            }

            return $meta . ',' . preg_replace('/\s+/', '', $data);
        }

        $clean = preg_replace('/\s+/', '', $trimmed);

        return 'data:image/png;base64,' . $clean;
    }

    protected function resolveInstanceState(?array $connectData, ?array $statusData): string
    {
        $candidates = [
            data_get($statusData, 'instance.state'),
            data_get($statusData, 'state'),
            data_get($statusData, 'status'),
            data_get($statusData, 'connectionStatus'),
            data_get($statusData, 'connection.state'),
            data_get($connectData, 'instance.state'),
            data_get($connectData, 'state'),
            data_get($connectData, 'status'),
            data_get($connectData, 'connection.state'),
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && $candidate !== '') {
                return strtoupper($candidate);
            }
        }

        return 'UNKNOWN';
    }

    protected function stateMeansConnected(?string $state): bool
    {
        if (! $state) {
            return false;
        }

        $normalized = strtoupper($state);

        $connectedStates = [
            'CONNECTED',
            'AUTHENTICATED',
            'AUTHENTICATED',
            'OPEN',
            'ONLINE',
            'WORKING',
            'DEVICE_CONNECTED',
            'PHONE_CONNECTED',
            'READY',
        ];

        if (in_array($normalized, $connectedStates, true)) {
            return true;
        }

        return str_starts_with($normalized, 'CONNECTED');
    }


}
