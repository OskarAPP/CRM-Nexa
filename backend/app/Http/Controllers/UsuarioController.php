<?php

namespace App\Http\Controllers;

use App\Models\CredencialWhatsapp;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsuarioController extends AuthController
{
    public function __construct()
    {
        parent::__construct();
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate($this->usuarioValidationRules());

        $usuario = $this->createUsuario($data);

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

    public function index(): JsonResponse
    {
        $usuarios = Usuario::orderByDesc('id')->get();

        return response()->json([
            'data' => $usuarios->map(fn (Usuario $usuario) => $this->formatUsuario($usuario)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->usuarioValidationRules());
        $usuario = $this->createUsuario($data);

        return response()->json([
            'message' => 'Usuario creado correctamente.',
            'data' => $this->formatUsuario($usuario),
        ], 201);
    }

    public function show(Usuario $usuario): JsonResponse
    {
        return response()->json([
            'data' => $this->formatUsuario($usuario),
        ]);
    }

    public function update(Request $request, Usuario $usuario): JsonResponse
    {
        $data = $request->validate($this->usuarioValidationRules($usuario, false));

        if (array_key_exists('nombre', $data)) {
            $usuario->nombre = $data['nombre'];
        }

        if (array_key_exists('email', $data)) {
            $usuario->email = $data['email'];
        }

        if (! empty($data['password'])) {
            $usuario->password_hash = Hash::make($data['password']);
        }

        $usuario->save();

        return response()->json([
            'message' => 'Usuario actualizado correctamente.',
            'data' => $this->formatUsuario($usuario),
        ]);
    }

    public function destroy(Usuario $usuario): JsonResponse
    {
        $usuario->tokens()->delete();
        CredencialWhatsapp::where('user_id', $usuario->id)->delete();
        $usuario->delete();

        return response()->json([
            'message' => 'Usuario eliminado correctamente.',
        ]);
    }

    protected function usuarioValidationRules(?Usuario $usuario = null, bool $isCreate = true): array
    {
        $nameRule = $isCreate ? 'required' : 'sometimes';
        $emailRule = $isCreate ? 'required' : 'sometimes';
        $passwordRule = $isCreate ? 'required' : 'nullable';

        $passwordRules = [$passwordRule, 'string', 'min:12', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/', 'confirmed'];

        return [
            'nombre' => [$nameRule, 'string', 'max:100'],
            'email' => [
                $emailRule,
                'email',
                'max:150',
                Rule::unique('usuarios', 'email')->ignore($usuario?->id),
            ],
            'password' => $passwordRules,
        ];
    }

    protected function createUsuario(array $data): Usuario
    {
        return Usuario::create([
            'nombre' => $data['nombre'],
            'email' => $data['email'],
            'password_hash' => Hash::make($data['password']),
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
