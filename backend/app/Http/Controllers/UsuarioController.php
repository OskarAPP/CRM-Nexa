<?php

namespace App\Http\Controllers;

use App\Models\CredencialWhatsapp;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends AuthController
{
    public function __construct()
    {
        parent::__construct();
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', 'unique:usuarios,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $usuario = Usuario::create([
            'nombre' => $data['nombre'],
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
        ]);

        $token = $usuario->createToken('crm-nexa-api')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado correctamente.',
            'data' => $this->formatUsuario($usuario),
            'user' => $this->formatUsuario($usuario),
            'id' => $usuario->id,
            'user_id' => $usuario->id,
            'token' => $token,
            'credencial_whatsapp' => null,
            'whatsapp_session' => null,
            'whatsapp_api_response' => null,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $usuario = Usuario::where('email', $credentials['email'])->first();

        if (! $usuario || ! Hash::check($credentials['password'], $usuario->password_hash)) {
            return response()->json([
                'message' => 'Credenciales inválidas.',
            ], 401);
        }

        $usuario->tokens()->delete();

        $token = $usuario->createToken('crm-nexa-api')->plainTextToken;

        $credencial = CredencialWhatsapp::where('user_id', $usuario->id)->first();
        $whatsappSession = null;

        if ($credencial) {
            $connectResponse = $this->requestEvolutionConnect($credencial);
            $statusResponse = $this->requestEvolutionStatus($credencial);

            $whatsappSession = $this->buildWhatsappPayload($connectResponse, $statusResponse);

            $credencial->makeHidden(['instancia', 'apikey']);
        }

        return response()->json([
            'message' => 'Inicio de sesión correcto.',
            'data' => $this->formatUsuario($usuario),
            'user' => $this->formatUsuario($usuario),
            'id' => $usuario->id,
            'user_id' => $usuario->id,
            'token' => $token,
            'credencial_whatsapp' => $credencial,
            'whatsapp_session' => $whatsappSession,
            'whatsapp_api_response' => $whatsappSession,
        ]);
    }

    protected function formatUsuario(Usuario $usuario): array
    {
        return [
            'id' => $usuario->id,
            'nombre' => $usuario->nombre,
            'email' => $usuario->email,
            'creadoEn' => optional($usuario->creado_en)->toIso8601String(),
        ];
    }
}
