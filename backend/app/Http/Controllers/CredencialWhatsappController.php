<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\CredencialWhatsapp;

class CredencialWhatsappController extends Controller
{
    protected function userOrFail(Request $request)
    {
        $user = $request->user();

        if (! $user) {
            abort(response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado'
            ], 401));
        }

        return $user;
    }

    protected function ensureOwnership(Request $request, CredencialWhatsapp $credencial): void
    {
        $user = $this->userOrFail($request);

        if ((int) $credencial->user_id !== (int) $user->id) {
            abort(response()->json([
                'success' => false,
                'message' => 'No tienes permisos para esta credencial'
            ], 403));
        }
    }

    protected function sanitizePayload(array $data): array
    {
        return [
            'instancia' => array_key_exists('instancia', $data) ? trim($data['instancia']) : null,
            'apikey' => array_key_exists('apikey', $data) ? trim($data['apikey']) : null,
        ];
    }

    public function store(Request $request)
    {
        $user = $this->userOrFail($request);

        $data = $request->validate([
            'instancia' => 'required|string|max:255',
            'apikey' => 'required|string|max:50',
        ]);

        $exists = CredencialWhatsapp::where('user_id', $user->id)->exists();
        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe una credencial registrada, utiliza la actualización.'
            ], 409);
        }

        $payload = $this->sanitizePayload($data);
        $credencial = CredencialWhatsapp::create([
            'user_id' => $user->id,
            'instancia' => $payload['instancia'],
            'apikey' => $payload['apikey'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $credencial->makeHidden(['instancia', 'apikey'])
        ], 201);
    }

    public function index(Request $request)
    {
        $user = $this->userOrFail($request);

        $credenciales = CredencialWhatsapp::where('user_id', $user->id)->get();

        return response()->json([
            'success' => true,
            'data' => $credenciales->map->makeHidden(['instancia', 'apikey'])
        ]);
    }

    public function show(Request $request, CredencialWhatsapp $credencial): JsonResponse
    {
        $this->ensureOwnership($request, $credencial);

        return response()->json([
            'success' => true,
            'data' => $credencial->makeHidden(['instancia', 'apikey'])
        ]);
    }

    public function update(Request $request, CredencialWhatsapp $credencial): JsonResponse
    {
        $this->ensureOwnership($request, $credencial);

        $data = $request->validate([
            'instancia' => 'sometimes|required|string|max:255',
            'apikey' => 'sometimes|required|string|max:50',
        ]);

        $payload = $this->sanitizePayload($data);

        if ($payload['instancia'] !== null) {
            $credencial->instancia = $payload['instancia'];
        }

        if ($payload['apikey'] !== null) {
            $credencial->apikey = $payload['apikey'];
        }

        $credencial->save();

        return response()->json([
            'success' => true,
            'data' => $credencial->makeHidden(['instancia', 'apikey'])
        ]);
    }

    public function destroy(Request $request, CredencialWhatsapp $credencial): JsonResponse
    {
        $this->ensureOwnership($request, $credencial);

        $credencial->delete();

        return response()->json([
            'success' => true,
            'message' => 'Credencial eliminada correctamente'
        ], 200);
    }
}
