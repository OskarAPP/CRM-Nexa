<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'nombres' => 'required|string|max:255',
            'apellidos' => 'required|string|max:255',
            'numero_telefonico' => 'required|string|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed', // password + password_confirmation
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

        return response()->json([
            'message' => 'Usuario registrado correctamente',
            'user' => $user->makeHidden(['password']),
        ], 201);
    }

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

        // Si no usas tokens, devolvemos usuario (sin contraseña)
        return response()->json([
            'message' => 'Inicio de sesión correcto',
            'user' => $user->makeHidden(['password']),
        ], 200);
    }
}
