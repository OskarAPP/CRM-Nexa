<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CredencialWhatsapp;

class CredencialWhatsappController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $data = $request->validate([
            'instancia' => 'required|string|max:255',
            'apikey' => 'required|string|max:50',
        ]);

        $credencial = CredencialWhatsapp::updateOrCreate(
            ['user_id' => $user->id],
            [
                'instancia' => trim($data['instancia']),
                'apikey' => trim($data['apikey']),
            ]
        );

        $status = $credencial->wasRecentlyCreated ? 201 : 200;

        return response()->json([
            'success' => true,
            'data' => $credencial->makeHidden(['instancia', 'apikey'])
        ], $status);
    }

    public function index(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        $credenciales = CredencialWhatsapp::where('user_id', $user->id)->get();

        return response()->json([
            'success' => true,
            'data' => $credenciales->map->makeHidden(['instancia', 'apikey'])
        ]);
    }
}
