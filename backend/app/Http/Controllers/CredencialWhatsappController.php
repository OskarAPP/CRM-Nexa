<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CredencialWhatsapp;

class CredencialWhatsappController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer',
            'instancia' => 'required|string|max:255',
            'apikey' => 'required|string|max:50',
        ]);

        $credencial = CredencialWhatsapp::create($request->only(['user_id', 'instancia', 'apikey']));

        return response()->json([
            'success' => true,
            'data' => $credencial
        ], 201);
    }

    public function index()
    {
        $credenciales = CredencialWhatsapp::all();

        return response()->json([
            'success' => true,
            'data' => $credenciales
        ]);
    }
}
