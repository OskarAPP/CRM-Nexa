<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    // Registro de usuario
    public function register(Request $request)
    {
        $data = $request->validate([
            'nombres' => 'required|string|max:255',
            'apellidos' => 'required|string|max:255',
            'numero_telefonico' => 'required|string|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
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

        // Crear token al registrarse
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado correctamente',
            'user' => $user->makeHidden(['password']),
            'token' => $token,
        ], 201);
    }

    // Login con token y consulta de credenciales WhatsApp
public function login(Request $request)
{
    $data = $request->validate([
        'email' => 'required|email',
        'password' => 'required|string',
    ]);

    $user = User::where('email', $data['email'])->first();

    if (! $user || ! Hash::check($data['password'], $user->password)) {
        return response()->json([
            'message' => 'Credenciales inválidas'
        ], 401);
    }

    // Generar token
    $token = $user->createToken('auth_token')->plainTextToken;

    // Buscar credenciales WhatsApp del usuario
    $credencial = \App\Models\CredencialWhatsapp::where('user_id', $user->id)->first();

    $whatsappData = null;

    if ($credencial) {
        $apiUrl = "https://nexa-evolution-api.yyfvlz.easypanel.host";
        $instanceName = $credencial->instancia;
        $apiKey = $credencial->apikey;

        // Construir URL del endpoint
        $endpoint = "/instance/connect/" . $instanceName;
        $fullUrl = $apiUrl . $endpoint;

        // Inicializar cURL
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "apikey: " . $apiKey
        ]);

        // Ejecutar solicitud
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (!curl_errno($ch) && $httpCode == 200) {
            $whatsappData = json_decode($response, true);
        } else {
            $whatsappData = [
                'error' => curl_errno($ch) ? curl_error($ch) : $response,
                'http_code' => $httpCode
            ];
        }

        curl_close($ch);

        // Ocultar instancia y apikey antes de enviar la respuesta
        $credencial->makeHidden(['instancia', 'apikey']);
    }

    return response()->json([
        'message' => 'Inicio de sesión correcto',
        'user' => $user->makeHidden(['password']),
        'token' => $token,
        'credencial_whatsapp' => $credencial,
        'whatsapp_api_response' => $whatsappData
    ], 200);
}

    // Cerrar sesión (eliminar tokens)
    public function logout(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ]);
    }

    // Perfil del usuario autenticado
    public function perfil(Request $request)
    {
        return response()->json([
            'user' => $request->user()->makeHidden(['password']),
        ]);
    }
}
